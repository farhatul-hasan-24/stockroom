"""
Sales views — Atomic POS Checkout

Implements the exact 8-step sequence from the spec:
  1. Start transaction
  2. Lock product rows (SELECT FOR UPDATE)
  3. Validate stock levels (no negative stock ever)
  4. Create Sale record
  5. Create SaleItems
  6. Decrement stock via InventoryService
  7. Log StockMovement entry
  8. Commit

Any failure → full rollback. No partial writes.
"""

from django.db import transaction
from rest_framework import generics, status, viewsets
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.products.models import Product
from apps.customers.models import Customer
from apps.inventory.services import InventoryService, InsufficientStockError
from apps.users.permissions import CanProcessSales, IsAdminOrManager

from .models import Sale, SaleItem
from .serializers import (
    CheckoutSerializer,
    SaleListSerializer,
    SaleDetailSerializer,
)


class CheckoutView(generics.GenericAPIView):
    """
    POST /api/v1/sales/checkout/
    The atomic POS checkout endpoint.
    """
    serializer_class = CheckoutSerializer
    permission_classes = [CanProcessSales]

    @transaction.atomic
    def post(self, request):
        # Deserialize + validate input
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # --- STEP 2: Lock all product rows (SELECT FOR UPDATE) ---
        product_ids = [item["product"] for item in data["items"]]
        locked_products = {
            p.pk: p
            for p in Product.objects.select_for_update().filter(pk__in=product_ids)
        }

        # Verify all products exist
        missing = set(product_ids) - set(locked_products.keys())
        if missing:
            return Response(
                {"detail": f"Products not found: {list(missing)}"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # --- STEP 3: Validate stock levels ---
        errors = []
        for item in data["items"]:
            product = locked_products[item["product"]]
            if product.current_stock < item["quantity"]:
                errors.append({
                    "product": product.name,
                    "sku": product.sku,
                    "available": product.current_stock,
                    "requested": item["quantity"],
                })
        if errors:
            return Response(
                {"detail": "Insufficient stock for one or more items.", "items": errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve customer (nullable = walk-in)
        customer = None
        if data.get("customer"):
            try:
                customer = Customer.objects.get(pk=data["customer"])
            except Customer.DoesNotExist:
                return Response({"detail": "Customer not found."}, status=status.HTTP_404_NOT_FOUND)

        # Calculate grand total
        subtotal = sum(
            item["quantity"] * item["unit_price"] for item in data["items"]
        )
        discount = data.get("discount", 0)
        grand_total = max(subtotal - discount, 0)

        # --- STEP 4: Create Sale record ---
        sale = Sale.objects.create(
            customer=customer,
            grand_total=grand_total,
            discount=discount,
            payment_method=data.get("payment_method", "cash"),
            notes=data.get("notes", ""),
            created_by=request.user,
        )

        # --- STEP 5: Create SaleItems ---
        for item in data["items"]:
            SaleItem.objects.create(
                sale=sale,
                product_id=item["product"],
                quantity=item["quantity"],
                unit_price=item["unit_price"],
            )

        # --- STEPS 6 & 7: Decrement stock + log StockMovement ---
        for item in data["items"]:
            InventoryService.deduct_stock(
                product_id=item["product"],
                qty=item["quantity"],
                ref_type="SALE",
                ref_id=sale.reference,
                user=request.user,
            )

        # --- STEP 8: Commit (happens automatically on context exit) ---
        return Response(
            SaleDetailSerializer(sale).data,
            status=status.HTTP_201_CREATED,
        )


class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    """GET /api/v1/sales/ and GET /api/v1/sales/{id}/"""
    permission_classes = [IsAdminOrManager]

    def get_queryset(self):
        qs = Sale.objects.select_related("customer", "created_by").prefetch_related("items__product")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        customer = self.request.query_params.get("customer")
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if customer:
            qs = qs.filter(customer_id=customer)
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SaleDetailSerializer
        return SaleListSerializer


class FinancialReportView(generics.GenericAPIView):
    """
    GET /api/v1/sales/reports/
    Admin: full. Manager: view only. Sales staff: no access.
    """
    permission_classes = [IsAdminOrManager]

    def get(self, request):
        from django.db.models import Sum, Count, Avg, F, ExpressionWrapper, DecimalField
        from django.utils import timezone
        import datetime

        period = request.query_params.get("period", "month")
        today = timezone.now().date()

        if period == "today":
            start = today
        elif period == "week":
            start = today - datetime.timedelta(days=7)
        elif period == "month":
            start = today.replace(day=1)
        elif period == "year":
            start = today.replace(month=1, day=1)
        else:
            start = today.replace(day=1)

        sales_qs = Sale.objects.filter(created_at__date__gte=start, status="completed")

        aggregates = sales_qs.aggregate(
            total_revenue=Sum("grand_total"),
            total_discount=Sum("discount"),
            total_orders=Count("id"),
            avg_order_value=Avg("grand_total"),
        )

        # Cost of goods sold
        from apps.products.models import Product
        from apps.sales.models import SaleItem
        cogs_data = (
            SaleItem.objects.filter(sale__in=sales_qs)
            .annotate(
                cogs=ExpressionWrapper(
                    F("quantity") * F("product__purchase_price"),
                    output_field=DecimalField(),
                )
            )
            .aggregate(total_cogs=Sum("cogs"))
        )
        total_cogs = cogs_data["total_cogs"] or 0
        total_revenue = aggregates["total_revenue"] or 0
        gross_profit = float(total_revenue) - float(total_cogs)

        return Response({
            "period": period,
            "start_date": str(start),
            "end_date": str(today),
            "total_revenue": float(total_revenue),
            "total_discount": float(aggregates["total_discount"] or 0),
            "total_orders": aggregates["total_orders"],
            "avg_order_value": float(aggregates["avg_order_value"] or 0),
            "total_cogs": float(total_cogs),
            "gross_profit": gross_profit,
            "gross_margin_pct": round(gross_profit / float(total_revenue) * 100, 2) if total_revenue else 0,
        })

"""
Inventory views:
  GET  /api/v1/inventory/movements/   — paginated audit trail
  POST /api/v1/inventory/adjust/      — manual stock adjustment (admin/manager)
  GET  /api/v1/dashboard/summary/     — KPI aggregates
"""

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Sum, Count, Q, F

from .models import StockMovement
from .serializers import StockMovementSerializer, StockAdjustmentSerializer
from .services import InventoryService
from apps.users.permissions import IsAdminOrManager, CanViewAuditLogs


class StockMovementListView(generics.ListAPIView):
    """
    GET /api/v1/inventory/movements/
    Paginated, filterable audit trail.
    Admin only per RBAC matrix.
    """
    serializer_class = StockMovementSerializer
    permission_classes = [CanViewAuditLogs]

    def get_queryset(self):
        qs = StockMovement.objects.select_related("product", "created_by")
        product_id = self.request.query_params.get("product_id")
        movement_type = self.request.query_params.get("movement_type")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if product_id:
            qs = qs.filter(product_id=product_id)
        if movement_type:
            qs = qs.filter(movement_type=movement_type)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


class StockAdjustmentView(generics.GenericAPIView):
    """
    POST /api/v1/inventory/adjust/
    Manual stock-take adjustment. Admin/Manager only.
    """
    serializer_class = StockAdjustmentSerializer
    permission_classes = [IsAdminOrManager]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        movement = InventoryService.adjust_stock(
            product_id=data["product_id"],
            new_stock_level=data["new_stock_level"],
            user=request.user,
            notes=data.get("notes", ""),
        )
        return Response(StockMovementSerializer(movement).data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """
    GET /api/v1/dashboard/summary/
    Aggregated KPIs for the dashboard.
    """
    from apps.products.models import Product
    from apps.sales.models import Sale

    today = timezone.now().date()

    total_products = Product.objects.filter(status="active").count()

    low_stock_alerts = Product.objects.filter(
        status="active",
        current_stock__lte=F("minimum_stock"),
        current_stock__gt=0,
    ).count()

    out_of_stock = Product.objects.filter(status="active", current_stock=0).count()

    today_sales_bdt = (
        Sale.objects.filter(created_at__date=today)
        .aggregate(total=Sum("grand_total"))["total"]
        or 0
    )

    # Last 7 days sales for sparkline
    from django.db.models.functions import TruncDate
    import datetime

    seven_days_ago = today - datetime.timedelta(days=6)
    daily_sales = (
        Sale.objects.filter(created_at__date__gte=seven_days_ago)
        .annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(total=Sum("grand_total"), count=Count("id"))
        .order_by("date")
    )

    # Top low-stock products
    low_stock_products = (
        Product.objects.filter(status="active", current_stock__lte=F("minimum_stock"))
        .order_by("current_stock")[:5]
        .values("id", "name", "sku", "current_stock", "minimum_stock", "unit")
    )

    return Response({
        "total_products": total_products,
        "low_stock_alerts": low_stock_alerts,
        "out_of_stock": out_of_stock,
        "today_sales_bdt": float(today_sales_bdt),
        "daily_sales": list(daily_sales),
        "low_stock_products": list(low_stock_products),
    })

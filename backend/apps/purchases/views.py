"""
Purchases views.
POST /api/v1/purchases/ → creates Purchase + items + increments stock via InventoryService.
"""

from django.db import transaction
from rest_framework import generics, status, viewsets
from rest_framework.response import Response

from apps.suppliers.models import Supplier
from apps.products.models import Product
from apps.inventory.services import InventoryService
from apps.users.permissions import IsAdminOrManager, IsAdminOrManagerReadOnly

from .models import Purchase, PurchaseItem
from .serializers import (
    PurchaseListSerializer,
    PurchaseDetailSerializer,
    PurchaseCreateSerializer,
)


class PurchaseViewSet(viewsets.ReadOnlyModelViewSet):
    """GET list + detail — Admin/Manager only."""
    permission_classes = [IsAdminOrManager]

    def get_queryset(self):
        qs = Purchase.objects.select_related("supplier", "created_by").prefetch_related("items__product")
        supplier = self.request.query_params.get("supplier")
        status_filter = self.request.query_params.get("status")
        if supplier:
            qs = qs.filter(supplier_id=supplier)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PurchaseDetailSerializer
        return PurchaseListSerializer


class PurchaseCreateView(generics.CreateAPIView):
    """
    POST /api/v1/purchases/
    Atomically creates purchase + line items + increments stock.
    """
    permission_classes = [IsAdminOrManager]
    serializer_class = PurchaseCreateSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Validate supplier
        try:
            supplier = Supplier.objects.get(pk=data["supplier"])
        except Supplier.DoesNotExist:
            return Response({"detail": "Supplier not found."}, status=status.HTTP_404_NOT_FOUND)

        # Create Purchase header
        purchase = Purchase.objects.create(
            supplier=supplier,
            notes=data.get("notes", ""),
            created_by=request.user,
        )

        total_cost = 0
        for item_data in data["items"]:
            try:
                product = Product.objects.get(pk=item_data["product"])
            except Product.DoesNotExist:
                raise ValueError(f"Product {item_data['product']} not found.")

            qty = item_data["quantity"]
            unit_cost = item_data["unit_cost"]

            # Create line item
            PurchaseItem.objects.create(
                purchase=purchase,
                product=product,
                quantity=qty,
                unit_cost=unit_cost,
            )
            total_cost += qty * unit_cost

            # Increment stock through InventoryService (atomic, logs movement)
            InventoryService.add_stock(
                product_id=product.pk,
                qty=qty,
                ref_type="PURCHASE",
                ref_id=purchase.reference,
                user=request.user,
            )

        # Update total cost
        Purchase.objects.filter(pk=purchase.pk).update(total_cost=total_cost)
        purchase.refresh_from_db()

        return Response(
            PurchaseDetailSerializer(purchase).data,
            status=status.HTTP_201_CREATED,
        )

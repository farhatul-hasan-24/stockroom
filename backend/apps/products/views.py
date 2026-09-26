from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Category, Product
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductCreateUpdateSerializer,
)
from apps.users.permissions import IsAdminOrManagerReadOnly


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrManagerReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]


class ProductViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAdminOrManagerReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sku", "barcode"]
    ordering_fields = ["name", "current_stock", "selling_price", "created_at"]

    def get_queryset(self):
        qs = Product.objects.select_related("category", "supplier")
        status_filter = self.request.query_params.get("status")
        category = self.request.query_params.get("category")
        low_stock = self.request.query_params.get("low_stock")

        if status_filter:
            qs = qs.filter(status=status_filter)
        if category:
            qs = qs.filter(category_id=category)
        if low_stock == "true":
            from django.db.models import F
            qs = qs.filter(current_stock__lte=F("minimum_stock"))
        return qs

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return ProductCreateUpdateSerializer
        return ProductListSerializer

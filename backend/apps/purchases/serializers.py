from rest_framework import serializers
from .models import Purchase, PurchaseItem


class PurchaseItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = PurchaseItem
        fields = ["id", "product", "product_name", "product_sku",
                  "quantity", "unit_cost", "subtotal"]
        read_only_fields = ["id", "subtotal", "product_name", "product_sku"]


class PurchaseItemCreateSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class PurchaseListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.company_name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Purchase
        fields = ["id", "reference", "supplier", "supplier_name",
                  "total_cost", "status", "notes", "item_count",
                  "created_by", "created_by_name", "created_at"]
        read_only_fields = ["id", "reference", "total_cost", "created_at"]


class PurchaseDetailSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.company_name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)
    items = PurchaseItemSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = ["id", "reference", "supplier", "supplier_name",
                  "total_cost", "status", "notes", "items",
                  "created_by", "created_by_name", "created_at"]
        read_only_fields = ["id", "reference", "total_cost", "created_at"]


class PurchaseCreateSerializer(serializers.Serializer):
    supplier = serializers.IntegerField()
    items = PurchaseItemCreateSerializer(many=True, min_length=1)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("At least one item is required.")
        product_ids = [i["product"] for i in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Duplicate products in the same purchase are not allowed.")
        return items

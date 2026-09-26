from rest_framework import serializers
from .models import Sale, SaleItem


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = SaleItem
        fields = ["id", "product", "product_name", "product_sku",
                  "quantity", "unit_price", "subtotal"]
        read_only_fields = ["id", "subtotal", "product_name", "product_sku"]


class SaleItemInputSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)


class CheckoutSerializer(serializers.Serializer):
    """Input payload for POST /api/v1/sales/checkout/"""
    customer = serializers.IntegerField(required=False, allow_null=True)
    items = SaleItemInputSerializer(many=True, min_length=1)
    discount = serializers.DecimalField(max_digits=10, decimal_places=2, default=0, min_value=0)
    payment_method = serializers.ChoiceField(choices=["cash", "card", "mobile_banking"], default="cash")
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Cart cannot be empty.")
        product_ids = [i["product"] for i in items]
        if len(product_ids) != len(set(product_ids)):
            raise serializers.ValidationError("Duplicate products in cart. Merge quantities instead.")
        return items


class SaleListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)
    item_count = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model = Sale
        fields = ["id", "reference", "customer", "customer_name",
                  "grand_total", "discount", "payment_method", "status",
                  "item_count", "created_by", "created_by_name", "created_at"]
        read_only_fields = fields


class SaleDetailSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source="customer.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = ["id", "reference", "customer", "customer_name",
                  "grand_total", "discount", "payment_method", "status",
                  "notes", "items", "created_by", "created_by_name", "created_at"]
        read_only_fields = fields

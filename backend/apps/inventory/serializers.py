from rest_framework import serializers
from .models import StockMovement


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    created_by_name = serializers.CharField(source="created_by.name", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id", "product", "product_name", "product_sku",
            "movement_type", "quantity", "prev_stock", "new_stock",
            "ref_type", "ref_id", "notes",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = fields


class StockAdjustmentSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    new_stock_level = serializers.IntegerField(min_value=0)
    notes = serializers.CharField(required=False, allow_blank=True)

from rest_framework import serializers
from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "description", "product_count", "created_at"]
        read_only_fields = ["id", "created_at"]

    def get_product_count(self, obj):
        return obj.products.filter(status="active").count()


class ProductListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.company_name", read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    profit_margin = serializers.FloatField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id", "sku", "barcode", "name",
            "category", "category_name",
            "supplier", "supplier_name",
            "purchase_price", "selling_price",
            "current_stock", "minimum_stock",
            "unit", "image_url", "status",
            "is_low_stock", "profit_margin",
            "created_at",
        ]
        read_only_fields = ["id", "current_stock", "created_at"]


class ProductCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            "sku", "barcode", "name",
            "category", "supplier",
            "purchase_price", "selling_price",
            "minimum_stock", "unit", "image_url", "status",
        ]

    def validate_selling_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Selling price must be greater than zero.")
        return value

    def validate_purchase_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("Purchase price must be greater than zero.")
        return value

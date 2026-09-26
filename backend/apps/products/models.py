"""
StockRoom Products & Categories Models
"""

from django.db import models


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "categories"
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class ProductStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    DISCONTINUED = "discontinued", "Discontinued"


class Product(models.Model):
    sku = models.CharField(max_length=50, unique=True, db_index=True)
    barcode = models.CharField(max_length=100, blank=True, db_index=True)
    name = models.CharField(max_length=200)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    supplier = models.ForeignKey(
        "suppliers.Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="products",
    )
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    # current_stock is managed EXCLUSIVELY by InventoryService
    current_stock = models.IntegerField(default=0)
    minimum_stock = models.IntegerField(default=10)
    unit = models.CharField(max_length=20, default="pcs")
    image_url = models.URLField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ProductStatus.choices,
        default=ProductStatus.ACTIVE,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "products"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["barcode"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.sku} — {self.name}"

    @property
    def is_low_stock(self):
        return self.current_stock <= self.minimum_stock

    @property
    def is_out_of_stock(self):
        return self.current_stock == 0

    @property
    def profit_margin(self):
        if self.purchase_price == 0:
            return 0
        return round(
            ((self.selling_price - self.purchase_price) / self.purchase_price) * 100,
            2,
        )

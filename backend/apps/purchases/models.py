"""
StockRoom Purchases Models
Header-line pattern: Purchase → PurchaseItems
Stock is incremented via InventoryService on save.
"""

from django.db import models
from django.conf import settings


class PurchaseStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RECEIVED = "received", "Received"
    CANCELLED = "cancelled", "Cancelled"


class Purchase(models.Model):
    reference = models.CharField(max_length=50, unique=True, editable=False)
    supplier = models.ForeignKey(
        "suppliers.Supplier",
        on_delete=models.PROTECT,
        related_name="purchases",
    )
    total_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20, choices=PurchaseStatus.choices, default=PurchaseStatus.RECEIVED
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="purchases",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "purchases"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — {self.supplier.company_name}"

    def save(self, *args, **kwargs):
        if not self.reference:
            import datetime
            from django.db.models import Max
            today = datetime.date.today().strftime("%Y%m%d")
            last = Purchase.objects.filter(
                reference__startswith=f"PUR-{today}"
            ).aggregate(Max("reference"))["reference__max"]
            seq = int(last[-3:]) + 1 if last else 1
            self.reference = f"PUR-{today}-{seq:03d}"
        super().save(*args, **kwargs)


class PurchaseItem(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product", on_delete=models.PROTECT, related_name="purchase_items"
    )
    quantity = models.PositiveIntegerField()
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

    class Meta:
        db_table = "purchase_items"

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} × {self.quantity} @ ৳{self.unit_cost}"

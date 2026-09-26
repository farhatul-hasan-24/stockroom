"""
StockRoom Sales Models
Header-line pattern: Sale → SaleItems
Stock is ONLY decremented via atomic checkout in views.py.
"""

from django.db import models
from django.conf import settings


class SaleStatus(models.TextChoices):
    COMPLETED = "completed", "Completed"
    REFUNDED = "refunded", "Refunded"
    VOIDED = "voided", "Voided"


class PaymentMethod(models.TextChoices):
    CASH = "cash", "Cash"
    CARD = "card", "Card"
    MOBILE_BANKING = "mobile_banking", "Mobile Banking"


class Sale(models.Model):
    reference = models.CharField(max_length=50, unique=True, editable=False)
    customer = models.ForeignKey(
        "customers.Customer",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(
        max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH
    )
    status = models.CharField(
        max_length=20, choices=SaleStatus.choices, default=SaleStatus.COMPLETED
    )
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="sales",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sales"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} — ৳{self.grand_total}"

    def save(self, *args, **kwargs):
        if not self.reference:
            import datetime
            from django.db.models import Max
            today = datetime.date.today().strftime("%Y%m%d")
            last = Sale.objects.filter(
                reference__startswith=f"INV-{today}"
            ).aggregate(Max("reference"))["reference__max"]
            seq = int(last[-4:]) + 1 if last else 1
            self.reference = f"INV-{today}-{seq:04d}"
        super().save(*args, **kwargs)


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        "products.Product", on_delete=models.PROTECT, related_name="sale_items"
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, editable=False)

    class Meta:
        db_table = "sale_items"

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} × {self.quantity} @ ৳{self.unit_price}"

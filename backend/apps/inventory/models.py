"""
StockRoom Inventory Models
StockMovement is an immutable, append-only ledger.
Never update or delete rows — only INSERT via InventoryService.
"""

from django.db import models
from django.conf import settings


class MovementType(models.TextChoices):
    PURCHASE = "PURCHASE", "Purchase"
    SALE = "SALE", "Sale"
    DAMAGED = "DAMAGED", "Damaged"
    ADJUSTMENT = "ADJUSTMENT", "Adjustment"
    RETURN = "RETURN", "Return"


class StockMovement(models.Model):
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="movements",
    )
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity = models.IntegerField()          # positive = in, negative = out
    prev_stock = models.IntegerField()
    new_stock = models.IntegerField()
    ref_type = models.CharField(max_length=50, blank=True)   # "PURCHASE", "SALE", etc.
    ref_id = models.CharField(max_length=50, blank=True)     # e.g. "PUR-001"
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_movements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["product", "-created_at"]),
            models.Index(fields=["movement_type"]),
            models.Index(fields=["ref_type", "ref_id"]),
        ]

    def __str__(self):
        direction = "+" if self.quantity > 0 else ""
        return (
            f"{self.product.sku} | {self.movement_type} | "
            f"{direction}{self.quantity} | {self.prev_stock}→{self.new_stock}"
        )

    def save(self, *args, **kwargs):
        # Enforce immutability — only allow INSERT, never UPDATE
        if self.pk:
            raise PermissionError(
                "StockMovement records are immutable. "
                "Create a new corrective adjustment instead."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise PermissionError("StockMovement records cannot be deleted.")

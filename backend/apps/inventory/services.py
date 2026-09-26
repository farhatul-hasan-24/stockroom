"""
StockRoom InventoryService
=====================================================
ALL stock modifications MUST go through this service.
Direct edits to Product.current_stock are FORBIDDEN.

Every call is wrapped in @transaction.atomic and produces
an immutable StockMovement ledger row.
"""

from django.db import transaction
from django.core.exceptions import ValidationError
from apps.products.models import Product
from .models import StockMovement, MovementType


class InsufficientStockError(ValidationError):
    pass


class InventoryService:

    @staticmethod
    @transaction.atomic
    def add_stock(product_id: int, qty: int, ref_type: str, ref_id: str, user, notes: str = "") -> StockMovement:
        """
        Increase stock (Purchase / Return / Adjustment+).
        Locks the product row, updates stock, writes ledger.
        """
        if qty <= 0:
            raise ValueError("qty must be positive for add_stock.")

        product = Product.objects.select_for_update().get(pk=product_id)
        prev_stock = product.current_stock
        new_stock = prev_stock + qty

        Product.objects.filter(pk=product_id).update(current_stock=new_stock)

        movement = StockMovement(
            product=product,
            movement_type=MovementType.PURCHASE if ref_type == "PURCHASE" else MovementType.ADJUSTMENT,
            quantity=qty,
            prev_stock=prev_stock,
            new_stock=new_stock,
            ref_type=ref_type,
            ref_id=str(ref_id),
            notes=notes,
            created_by=user,
        )
        movement.save()

        # Trigger low-stock check task (non-blocking)
        from .tasks import check_low_stock_alert
        check_low_stock_alert.delay(product_id)

        return movement

    @staticmethod
    @transaction.atomic
    def deduct_stock(product_id: int, qty: int, ref_type: str, ref_id: str, user, notes: str = "") -> StockMovement:
        """
        Decrease stock (Sale / Damaged / Adjustment-).
        Locks the product row, validates no negative stock, updates, writes ledger.
        Raises InsufficientStockError if stock would go negative.
        """
        if qty <= 0:
            raise ValueError("qty must be positive for deduct_stock.")

        product = Product.objects.select_for_update().get(pk=product_id)
        prev_stock = product.current_stock

        if prev_stock < qty:
            raise InsufficientStockError(
                f"Insufficient stock for '{product.name}'. "
                f"Available: {prev_stock}, requested: {qty}."
            )

        new_stock = prev_stock - qty

        Product.objects.filter(pk=product_id).update(current_stock=new_stock)

        movement_type_map = {
            "SALE": MovementType.SALE,
            "DAMAGED": MovementType.DAMAGED,
            "ADJUSTMENT": MovementType.ADJUSTMENT,
        }
        movement_type = movement_type_map.get(ref_type, MovementType.ADJUSTMENT)

        movement = StockMovement(
            product=product,
            movement_type=movement_type,
            quantity=-qty,          # negative delta for outbound
            prev_stock=prev_stock,
            new_stock=new_stock,
            ref_type=ref_type,
            ref_id=str(ref_id),
            notes=notes,
            created_by=user,
        )
        movement.save()

        # Trigger low-stock check task
        from .tasks import check_low_stock_alert
        check_low_stock_alert.delay(product_id)

        return movement

    @staticmethod
    @transaction.atomic
    def adjust_stock(product_id: int, new_stock_level: int, user, notes: str = "") -> StockMovement:
        """
        Set stock to an exact value (stock-take / manual correction).
        Creates a signed ADJUSTMENT movement.
        """
        product = Product.objects.select_for_update().get(pk=product_id)
        prev_stock = product.current_stock
        delta = new_stock_level - prev_stock

        Product.objects.filter(pk=product_id).update(current_stock=new_stock_level)

        movement = StockMovement(
            product=product,
            movement_type=MovementType.ADJUSTMENT,
            quantity=delta,
            prev_stock=prev_stock,
            new_stock=new_stock_level,
            ref_type="ADJUSTMENT",
            ref_id="",
            notes=notes or f"Manual stock adjustment by {user.name}",
            created_by=user,
        )
        movement.save()
        return movement

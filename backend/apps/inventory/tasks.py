"""
StockRoom Inventory Celery Tasks
Low-stock email alerts sent via Redis queue.
"""

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings


@shared_task
def check_low_stock_alert(product_id: int):
    """
    Fires after any stock deduction.
    Sends email alert if product is at or below minimum_stock.
    """
    from apps.products.models import Product
    from apps.users.models import User, UserRole

    try:
        product = Product.objects.get(pk=product_id)
    except Product.DoesNotExist:
        return

    if product.current_stock <= product.minimum_stock:
        admin_emails = list(
            User.objects.filter(role=UserRole.ADMIN, is_active=True)
            .values_list("email", flat=True)
        )
        if not admin_emails:
            return

        subject = f"⚠️ Low Stock Alert: {product.name}"
        message = (
            f"Product: {product.name} (SKU: {product.sku})\n"
            f"Current Stock: {product.current_stock} {product.unit}\n"
            f"Minimum Stock: {product.minimum_stock} {product.unit}\n\n"
            f"Please restock this item immediately."
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.EMAIL_HOST_USER or "stockroom@system.local",
            recipient_list=admin_emails,
            fail_silently=True,
        )

"""
StockRoom URL Configuration
All API routes versioned under /api/v1/
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerUIView

urlpatterns = [
    path("admin/", admin.site.urls),

    # API v1
    path("api/v1/", include([
        # Auth
        path("auth/", include("apps.users.urls")),

        # Core entities
        path("products/", include("apps.products.urls")),
        path("suppliers/", include("apps.suppliers.urls")),
        path("customers/", include("apps.customers.urls")),

        # Transactions
        path("sales/", include("apps.sales.urls")),
        path("purchases/", include("apps.purchases.urls")),

        # Inventory
        path("inventory/", include("apps.inventory.urls")),

        # Dashboard
        path("dashboard/", include("apps.inventory.dashboard_urls")),

        # User management (admin only)
        path("users/", include("apps.users.user_urls")),
    ])),

    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerUIView.as_view(url_name="schema"), name="swagger-ui"),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

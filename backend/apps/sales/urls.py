from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CheckoutView, SaleViewSet, FinancialReportView

router = DefaultRouter()
router.register(r"", SaleViewSet, basename="sales")

urlpatterns = [
    path("checkout/", CheckoutView.as_view(), name="pos-checkout"),
    path("reports/", FinancialReportView.as_view(), name="financial-reports"),
    path("", include(router.urls)),
]

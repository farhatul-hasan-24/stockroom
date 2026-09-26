from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseViewSet, PurchaseCreateView

router = DefaultRouter()
router.register(r"", PurchaseViewSet, basename="purchases")

urlpatterns = [
    path("", PurchaseCreateView.as_view(), name="purchase-create"),
    path("list/", include(router.urls)),
]

from django.urls import path
from .views import StockMovementListView, StockAdjustmentView

urlpatterns = [
    path("movements/", StockMovementListView.as_view(), name="stock-movements"),
    path("adjust/", StockAdjustmentView.as_view(), name="stock-adjust"),
]

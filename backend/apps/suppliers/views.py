from rest_framework import viewsets, filters
from .models import Supplier
from .serializers import SupplierSerializer
from apps.users.permissions import IsAdminOrManagerReadOnly


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminOrManagerReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["company_name", "contact_person", "email", "phone"]
    ordering_fields = ["company_name", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get("status")
        if status:
            qs = qs.filter(status=status)
        return qs

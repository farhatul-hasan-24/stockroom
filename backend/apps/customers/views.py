from rest_framework import viewsets, filters
from .models import Customer
from .serializers import CustomerSerializer
from apps.users.permissions import IsAdminOrManagerReadOnly


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAdminOrManagerReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "phone", "email"]
    ordering_fields = ["name", "created_at"]

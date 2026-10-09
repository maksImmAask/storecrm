from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import Customer
from .serializers import CustomerSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_fields = ["company", "is_active"]
    search_fields = [
        "first_name",
        "last_name",
        "phone",
        "email",
    ]
    ordering_fields = ["first_name", "created_at"]
    ordering = ["first_name", "last_name"]

    def get_queryset(self):
        return Customer.objects.filter(
            company__owner=self.request.user,
        ).select_related("company")
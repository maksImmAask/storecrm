from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from apps.sales.models import Sale
from apps.sales.serializers import SaleSerializer
from apps.sales.services import complete_sale


class SaleViewSet(viewsets.ModelViewSet):
    serializer_class = SaleSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]
    filterset_fields = [
        "branch",
        "warehouse",
        "cashier",
        "customer",
        "status",
        "payment_type",
    ]
    search_fields = [
        "id",
        "customer__first_name",
        "customer__last_name",
        "customer__phone",
    ]
    ordering_fields = [
        "created_at",
        "completed_at",
        "total_amount",
    ]
    ordering = ["-created_at"]

    def get_queryset(self):
        return (
            Sale.objects
            .filter(branch__company__owner=self.request.user)
            .select_related(
                "branch",
                "warehouse",
                "cashier",
                "customer",
            )
            .prefetch_related("items", "items__product")
        )

    def perform_update(self, serializer):
        if serializer.instance.status != Sale.Status.DRAFT:
            raise ValidationError(
                "Only draft sales can be edited."
            )
        serializer.save()

    def perform_destroy(self, instance):
        if instance.status != Sale.Status.DRAFT:
            raise ValidationError(
                "Only draft sales can be deleted."
            )
        instance.delete()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        sale = self.get_object()
        sale = complete_sale(sale.id, request.user)

        return Response(
            self.get_serializer(sale).data,
            status=status.HTTP_200_OK,
        )
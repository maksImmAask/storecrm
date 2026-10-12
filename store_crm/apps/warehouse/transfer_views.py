from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.warehouse.models import StockTransfer
from apps.warehouse.services.transfers import complete_transfer
from apps.warehouse.transfer_serializers import StockTransferSerializer


class StockTransferViewSet(viewsets.ModelViewSet):
    serializer_class = StockTransferSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StockTransfer.objects.filter(
            source_warehouse__branch__company__owner=self.request.user
        ).select_related(
            "source_warehouse",
            "destination_warehouse",
            "created_by",
        ).prefetch_related("items", "items__product")

    def perform_destroy(self, instance):
        if instance.status != StockTransfer.Status.DRAFT:
            raise ValidationError("Only draft transfers can be deleted.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        transfer = complete_transfer(pk, request.user)
        return Response(
            self.get_serializer(transfer).data,
            status=status.HTTP_200_OK,
        )
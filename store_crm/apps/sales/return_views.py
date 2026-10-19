from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.sales.models import SaleReturn
from apps.sales.return_serializers import SaleReturnSerializer
from apps.sales.return_services import complete_return


class SaleReturnViewSet(viewsets.ModelViewSet):
    serializer_class = SaleReturnSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SaleReturn.objects.filter(
            sale__branch__company__owner=self.request.user
        ).select_related(
            "sale", "warehouse", "created_by"
        ).prefetch_related("items", "items__sale_item")

    def perform_destroy(self, instance):
        if instance.status != SaleReturn.Status.DRAFT:
            raise ValidationError("Only draft returns can be deleted.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        result = complete_return(pk, request.user)
        return Response(
            self.get_serializer(result).data,
            status=status.HTTP_200_OK,
        )
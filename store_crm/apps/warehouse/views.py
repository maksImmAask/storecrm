from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.filters import OrderingFilter, SearchFilter

from apps.warehouse.models import (
    Stock,
    StockMovement,
    StockReceipt,
    Warehouse,
)
from apps.warehouse.serializers import (
    StockMovementSerializer,
    StockReceiptSerializer,
    StockSerializer,
    WarehouseSerializer,
)
from apps.warehouse.services.receipts import complete_receipt


class WarehouseViewSet(viewsets.ModelViewSet):
    serializer_class = WarehouseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["branch"]
    search_fields = ["name", "address"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Warehouse.objects.filter(
            branch__company__owner=self.request.user,
        ).select_related("branch", "branch__company")


class StockViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["warehouse", "product"]
    search_fields = ["product__name", "product__barcode", "product__sku"]
    ordering_fields = ["quantity", "updated_at"]
    ordering = ["product__name"]

    def get_queryset(self):
        return Stock.objects.filter(
            warehouse__branch__company__owner=self.request.user,
        ).select_related(
            "warehouse",
            "product",
            "warehouse__branch",
        )


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["warehouse", "product", "movement_type"]
    ordering_fields = ["created_at", "quantity"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return StockMovement.objects.filter(
            warehouse__branch__company__owner=self.request.user,
        ).select_related(
            "warehouse",
            "product",
            "created_by",
        )


class StockReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = StockReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["warehouse", "status"]
    search_fields = ["document_number", "comment"]
    ordering_fields = ["created_at", "completed_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return StockReceipt.objects.filter(
            warehouse__branch__company__owner=self.request.user,
        ).select_related(
            "warehouse",
            "created_by",
        ).prefetch_related("items", "items__product")

    def perform_destroy(self, instance):
        if instance.status != StockReceipt.Status.DRAFT:
            raise ValidationError(
                "Only draft receipts can be deleted."
            )
        instance.delete()

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        receipt = self.get_object()
        receipt = complete_receipt(receipt.id, request.user)

        return Response(
            self.get_serializer(receipt).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        receipt = self.get_object()

        if receipt.status != StockReceipt.Status.DRAFT:
            raise ValidationError(
                "Only draft receipts can be cancelled."
            )

        receipt.status = StockReceipt.Status.CANCELLED
        receipt.save(update_fields=["status"])

        return Response(self.get_serializer(receipt).data)
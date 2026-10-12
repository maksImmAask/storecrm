from django.db.models import Q
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.customers.models import Debt
from apps.customers.debt_serializers import DebtSerializer, PayDebtSerializer
from apps.customers.services import pay_debt


class DebtViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DebtSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Debt.objects.filter(
            customer__company__owner=self.request.user
        ).select_related(
            "customer", "sale"
        ).prefetch_related("payments")

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        serializer = PayDebtSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        debt = pay_debt(
            debt_id=pk,
            amount=serializer.validated_data["amount"],
            user=request.user,
            comment=serializer.validated_data.get("comment", ""),
        )

        return Response(
            DebtSerializer(debt).data,
            status=status.HTTP_200_OK,
        )
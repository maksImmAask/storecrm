from rest_framework import serializers

from .models import Debt, DebtPayment


class DebtPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DebtPayment
        fields = ["id", "debt", "amount", "comment", "created_at"]
        read_only_fields = fields


class DebtSerializer(serializers.ModelSerializer):
    payments = DebtPaymentSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(
        source="customer.__str__",
        read_only=True,
    )

    class Meta:
        model = Debt
        fields = [
            "id", "customer", "customer_name", "sale",
            "original_amount", "remaining_amount",
            "status", "created_at", "payments",
        ]
        read_only_fields = fields


class PayDebtSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=14, decimal_places=2)
    comment = serializers.CharField(required=False, allow_blank=True)
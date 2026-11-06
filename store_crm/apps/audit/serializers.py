from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(
        source="user.email",
        read_only=True,
        allow_null=True,
    )

    company_name = serializers.CharField(
        source="company.name",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = AuditLog
        fields = [
            "id",
            "company",
            "company_name",
            "user",
            "user_email",
            "action",
            "model_name",
            "object_id",
            "old_data",
            "new_data",
            "ip_address",
            "created_at",
        ]
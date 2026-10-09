from rest_framework import serializers

from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source="company.name",
        read_only=True,
    )

    class Meta:
        model = Supplier
        fields = [
            "id",
            "company",
            "company_name",
            "name",
            "contact_person",
            "phone",
            "email",
            "address",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "company_name",
            "created_at",
            "updated_at",
        ]

    def validate_company(self, company):
        if company.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError(
                "You cannot use another user's company."
            )
        return company
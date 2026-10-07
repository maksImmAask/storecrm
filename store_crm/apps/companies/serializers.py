from rest_framework import serializers

from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(
        source="owner.get_full_name",
        read_only=True,
    )

    class Meta:
        model = Company
        fields = [
            "id",
            "name",
            "owner",
            "owner_name",
            "phone",
            "address",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "owner",
            "owner_name",
            "created_at",
        ]
from rest_framework import serializers

from apps.warehouse.models import StockTransfer, StockTransferItem


class StockTransferItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = StockTransferItem
        fields = ["id", "product", "quantity"]
        read_only_fields = ["id"]


class StockTransferSerializer(serializers.ModelSerializer):
    items = StockTransferItemSerializer(many=True)

    class Meta:
        model = StockTransfer
        fields = [
            "id",
            "source_warehouse",
            "destination_warehouse",
            "status",
            "created_by",
            "comment",
            "created_at",
            "completed_at",
            "items",
        ]
        read_only_fields = [
            "id", "status", "created_by", "created_at", "completed_at",
        ]

    def validate(self, attrs):
        user = self.context["request"].user
        source = attrs.get(
            "source_warehouse",
            getattr(self.instance, "source_warehouse", None),
        )
        destination = attrs.get(
            "destination_warehouse",
            getattr(self.instance, "destination_warehouse", None),
        )

        if source and source.branch.company.owner_id != user.id:
            raise serializers.ValidationError(
                {"source_warehouse": "Access denied."}
            )

        if destination and destination.branch.company.owner_id != user.id:
            raise serializers.ValidationError(
                {"destination_warehouse": "Access denied."}
            )

        if source and destination:
            if source.branch.company_id != destination.branch.company_id:
                raise serializers.ValidationError(
                    "Warehouses must belong to the same company."
                )
            if source.id == destination.id:
                raise serializers.ValidationError(
                    "Warehouses must be different."
                )

        if self.instance and self.instance.status not in (
            StockTransfer.Status.DRAFT,
            StockTransfer.Status.IN_PROGRESS,
        ):
            raise serializers.ValidationError(
                "This transfer can no longer be edited."
            )

        return attrs

    def create(self, validated_data):
        items = validated_data.pop("items")
        transfer = StockTransfer.objects.create(
            **validated_data,
            created_by=self.context["request"].user,
        )

        for item in items:
            StockTransferItem.objects.create(
                transfer=transfer,
                **item,
            )

        return transfer

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if items is not None:
            instance.items.all().delete()
            for item in items:
                StockTransferItem.objects.create(
                    transfer=instance,
                    **item,
                )

        return instance
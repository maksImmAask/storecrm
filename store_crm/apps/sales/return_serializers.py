from rest_framework import serializers

from apps.sales.models import SaleReturn, SaleReturnItem


class SaleReturnItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleReturnItem
        fields = ["id", "sale_item", "quantity"]
        read_only_fields = ["id"]


class SaleReturnSerializer(serializers.ModelSerializer):
    items = SaleReturnItemSerializer(many=True)
    sale_number = serializers.IntegerField(source="sale.id", read_only=True)

    class Meta:
        model = SaleReturn
        fields = [
            "id", "sale", "sale_number", "warehouse", "status",
            "reason", "created_by", "created_at", "completed_at", "items",
        ]
        read_only_fields = [
            "id", "sale_number", "status", "created_by",
            "created_at", "completed_at",
        ]

    def validate(self, attrs):
        user = self.context["request"].user
        sale = attrs.get("sale", getattr(self.instance, "sale", None))
        warehouse = attrs.get(
            "warehouse",
            getattr(self.instance, "warehouse", None),
        )

        if sale and sale.branch.company.owner_id != user.id:
            raise serializers.ValidationError({"sale": "Access denied."})

        if warehouse and warehouse.branch.company.owner_id != user.id:
            raise serializers.ValidationError(
                {"warehouse": "Access denied."}
            )

        if sale and warehouse and sale.branch.company_id != warehouse.branch.company_id:
            raise serializers.ValidationError(
                "Sale and warehouse must belong to the same company."
            )

        if self.instance and self.instance.status != SaleReturn.Status.DRAFT:
            raise serializers.ValidationError(
                "Only draft returns can be edited."
            )

        items = attrs.get("items")
        if items is not None:
            ids = [item["sale_item"].id for item in items]
            if len(ids) != len(set(ids)):
                raise serializers.ValidationError(
                    {"items": "Each sale item may appear only once."}
                )

            if sale:
                for item in items:
                    if item["sale_item"].sale_id != sale.id:
                        raise serializers.ValidationError(
                            {"items": "An item belongs to another sale."}
                        )

        return attrs

    def create(self, validated_data):
        items = validated_data.pop("items")
        result = SaleReturn.objects.create(
            **validated_data,
            created_by=self.context["request"].user,
        )
        for item in items:
            SaleReturnItem.objects.create(sale_return=result, **item)
        return result

    def update(self, instance, validated_data):
        items = validated_data.pop("items", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()

        if items is not None:
            instance.items.all().delete()
            for item in items:
                SaleReturnItem.objects.create(
                    sale_return=instance,
                    **item,
                )
        return instance
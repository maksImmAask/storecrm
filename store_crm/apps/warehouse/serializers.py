from rest_framework import serializers

from apps.warehouse.models import (
    Stock,
    StockMovement,
    StockReceipt,
    StockReceiptItem,
    Warehouse,
)


class WarehouseSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    class Meta:
        model = Warehouse
        fields = [
            "id",
            "branch",
            "branch_name",
            "name",
            "address",
            "created_at",
        ]
        read_only_fields = ["id", "branch_name", "created_at"]

    def validate_branch(self, branch):
        if branch.company.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError(
                "You cannot use another company's branch."
            )
        return branch


class StockSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )
    available_quantity = serializers.DecimalField(
        max_digits=14,
        decimal_places=3,
        read_only=True,
    )

    class Meta:
        model = Stock
        fields = [
            "id",
            "warehouse",
            "warehouse_name",
            "product",
            "product_name",
            "quantity",
            "reserved_quantity",
            "available_quantity",
            "updated_at",
        ]
        read_only_fields = fields


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )
    created_by_name = serializers.CharField(
        source="created_by.get_full_name",
        read_only=True,
    )

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "warehouse",
            "warehouse_name",
            "product",
            "product_name",
            "movement_type",
            "quantity",
            "quantity_before",
            "quantity_after",
            "reference",
            "comment",
            "created_by",
            "created_by_name",
            "created_at",
        ]
        read_only_fields = fields


class StockReceiptItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    class Meta:
        model = StockReceiptItem
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "unit_cost",
        ]
        read_only_fields = ["id", "product_name"]


class StockReceiptSerializer(serializers.ModelSerializer):
    items = StockReceiptItemSerializer(many=True)
    warehouse_name = serializers.CharField(
        source="warehouse.name",
        read_only=True,
    )

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "warehouse",
            "warehouse_name",
            "document_number",
            "status",
            "comment",
            "created_by",
            "created_at",
            "completed_at",
            "items",
        ]
        read_only_fields = [
            "id",
            "warehouse_name",
            "status",
            "created_by",
            "created_at",
            "completed_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        warehouse = attrs.get(
            "warehouse",
            getattr(self.instance, "warehouse", None),
        )

        if warehouse and warehouse.branch.company.owner_id != request.user.id:
            raise serializers.ValidationError(
                {"warehouse": "You cannot use another company's warehouse."}
            )

        if self.instance and self.instance.status != StockReceipt.Status.DRAFT:
            raise serializers.ValidationError(
                "Only draft receipts can be edited."
            )

        items = attrs.get("items")

        if items is not None:
            product_ids = [item["product"].id for item in items]

            if len(product_ids) != len(set(product_ids)):
                raise serializers.ValidationError(
                    {"items": "Each product may appear only once per receipt."}
                )

            if warehouse:
                for item in items:
                    if item["product"].company_id != warehouse.branch.company_id:
                        raise serializers.ValidationError(
                            {"items": "A product belongs to another company."}
                        )

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        receipt = StockReceipt.objects.create(
            **validated_data,
            created_by=self.context["request"].user,
        )

        for item in items_data:
            StockReceiptItem.objects.create(
                receipt=receipt,
                **item,
            )

        return receipt

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                StockReceiptItem.objects.create(
                    receipt=instance,
                    **item,
                )

        return instance
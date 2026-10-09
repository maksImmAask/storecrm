from decimal import Decimal

from rest_framework import serializers

from apps.sales.models import Sale, SaleItem
from apps.warehouse.models import Warehouse


class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(
        source="product.name",
        read_only=True,
    )

    class Meta:
        model = SaleItem
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "unit_price",
            "unit_cost",
            "discount_amount",
            "line_total",
        ]
        read_only_fields = [
            "id",
            "product_name",
            "unit_price",
            "unit_cost",
            "line_total",
        ]


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    cashier_name = serializers.CharField(
        source="cashier.get_full_name",
        read_only=True,
    )

    class Meta:
        model = Sale
        fields = [
            "id",
            "branch",
            "warehouse",
            "cashier",
            "cashier_name",
            "customer",
            "status",
            "payment_type",
            "subtotal",
            "discount_amount",
            "total_amount",
            "paid_amount",
            "items",
            "comment",
            "created_at",
            "completed_at",
        ]
        read_only_fields = [
            "id",
            "cashier",
            "cashier_name",
            "status",
            "subtotal",
            "total_amount",
            "created_at",
            "completed_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]
        user = request.user

        branch = attrs.get(
            "branch",
            getattr(self.instance, "branch", None),
        )
        warehouse = attrs.get(
            "warehouse",
            getattr(self.instance, "warehouse", None),
        )
        customer = attrs.get("customer")

        if branch and branch.company.owner_id != user.id:
            raise serializers.ValidationError(
                {"branch": "You cannot use another company's branch."}
            )

        if warehouse and warehouse.branch.company.owner_id != user.id:
            raise serializers.ValidationError(
                {"warehouse": "You cannot use another company's warehouse."}
            )

        if branch and warehouse and warehouse.branch_id != branch.id:
            raise serializers.ValidationError(
                {"warehouse": "Warehouse must belong to the selected branch."}
            )

        if customer and branch and customer.company_id != branch.company_id:
            raise serializers.ValidationError(
                {"customer": "Customer belongs to another company."}
            )

        if self.instance and self.instance.status != Sale.Status.DRAFT:
            raise serializers.ValidationError(
                "Only draft sales can be edited."
            )

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        request = self.context["request"]

        sale = Sale.objects.create(
            **validated_data,
            cashier=request.user,
        )

        self._create_items(sale, items_data)
        return sale

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            self._create_items(instance, items_data)

        return instance

    @staticmethod
    def _create_items(sale, items_data):
        seen_products = set()

        for item_data in items_data:
            product = item_data["product"]

            if product.id in seen_products:
                raise serializers.ValidationError(
                    "Each product may appear only once in a sale."
                )

            seen_products.add(product.id)

            if product.company_id != sale.branch.company_id:
                raise serializers.ValidationError(
                    f"Product '{product.name}' belongs to another company."
                )

            quantity = item_data["quantity"]
            discount = item_data.get(
                "discount_amount",
                Decimal("0.00"),
            )

            unit_price = product.sale_price
            line_total = unit_price * quantity - discount

            if line_total < 0:
                raise serializers.ValidationError(
                    f"Invalid discount for '{product.name}'."
                )

            SaleItem.objects.create(
                sale=sale,
                product=product,
                quantity=quantity,
                unit_price=unit_price,
                unit_cost=product.purchase_price,
                discount_amount=discount,
                line_total=line_total,
            )
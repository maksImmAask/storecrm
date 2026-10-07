from rest_framework import serializers

from .models import Category, Product


class CategorySerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source="company.name",
        read_only=True,
    )

    parent_name = serializers.CharField(
        source="parent.name",
        read_only=True,
    )

    class Meta:
        model = Category
        fields = [
            "id",
            "company",
            "company_name",
            "name",
            "parent",
            "parent_name",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "company_name",
            "parent_name",
            "created_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]

        company = attrs.get(
            "company",
            getattr(self.instance, "company", None),
        )

        parent = attrs.get("parent")

        if company.owner_id != request.user.id:
            raise serializers.ValidationError(
                "You cannot use another user's company."
            )

        if parent:
            if parent.company_id != company.id:
                raise serializers.ValidationError(
                    "Parent category must belong to the same company."
                )

            if self.instance and parent.id == self.instance.id:
                raise serializers.ValidationError(
                    "A category cannot be its own parent."
                )

        return attrs


class ProductSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source="company.name",
        read_only=True,
    )

    category_name = serializers.CharField(
        source="category.name",
        read_only=True,
    )

    class Meta:
        model = Product

        fields = [
            "id",
            "company",
            "company_name",
            "category",
            "category_name",
            "name",
            "barcode",
            "sku",
            "purchase_price",
            "sale_price",
            "description",
            "image",
            "is_active",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "company_name",
            "category_name",
            "created_at",
            "updated_at",
        ]

    def validate(self, attrs):
        request = self.context["request"]

        company = attrs.get(
            "company",
            getattr(self.instance, "company", None),
        )

        category = attrs.get("category")

        if company.owner_id != request.user.id:
            raise serializers.ValidationError(
                "You cannot use another user's company."
            )

        if category and category.company_id != company.id:
            raise serializers.ValidationError(
                "Category must belong to the same company."
            )

        purchase_price = attrs.get(
            "purchase_price",
            getattr(self.instance, "purchase_price", None),
        )

        sale_price = attrs.get(
            "sale_price",
            getattr(self.instance, "sale_price", None),
        )

        if purchase_price is not None and purchase_price < 0:
            raise serializers.ValidationError(
                {
                    "purchase_price": "Purchase price cannot be negative."
                }
            )

        if sale_price is not None and sale_price < 0:
            raise serializers.ValidationError(
                {
                    "sale_price": "Sale price cannot be negative."
                }
            )

        return attrs
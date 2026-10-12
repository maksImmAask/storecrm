from rest_framework import serializers

from .models import Expense, ExpenseCategory


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ["id", "company", "name", "is_active"]

    def validate_company(self, company):
        if company.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Access denied.")
        return company


class ExpenseSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id",
            "company",
            "branch",
            "category",
            "amount",
            "payment_method",
            "description",
            "expense_date",
            "created_by",
            "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        user = self.context["request"].user
        company = attrs.get(
            "company",
            getattr(self.instance, "company", None),
        )
        branch = attrs.get(
            "branch",
            getattr(self.instance, "branch", None),
        )
        category = attrs.get(
            "category",
            getattr(self.instance, "category", None),
        )

        if company and company.owner_id != user.id:
            raise serializers.ValidationError(
                {"company": "Access denied."}
            )

        if branch and company and branch.company_id != company.id:
            raise serializers.ValidationError(
                {"branch": "Branch belongs to another company."}
            )

        if category and company and category.company_id != company.id:
            raise serializers.ValidationError(
                {"category": "Category belongs to another company."}
            )

        return attrs

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
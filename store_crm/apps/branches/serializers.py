from rest_framework import serializers

from apps.companies.models import Company

from .models import Branch, UserBranchRole


class BranchSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(
        source="company.name",
        read_only=True,
    )

    class Meta:
        model = Branch

        fields = [
            "id",
            "company",
            "company_name",
            "name",
            "address",
            "phone",
            "is_active",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "company_name",
            "created_at",
        ]

    def validate_company(self, company):
        request = self.context["request"]

        if company.owner_id != request.user.id:
            raise serializers.ValidationError(
                "You cannot use another user's company."
            )

        return company


class UserBranchRoleSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(
        source="user.get_full_name",
        read_only=True,
    )

    branch_name = serializers.CharField(
        source="branch.name",
        read_only=True,
    )

    role_display = serializers.CharField(
        source="get_role_display",
        read_only=True,
    )

    class Meta:
        model = UserBranchRole

        fields = [
            "id",
            "user",
            "user_name",
            "branch",
            "branch_name",
            "role",
            "role_display",
        ]

        read_only_fields = [
            "id",
            "user_name",
            "branch_name",
            "role_display",
        ]

    def validate_branch(self, branch):
        request = self.context["request"]

        if branch.company.owner_id != request.user.id:
            raise serializers.ValidationError(
                "You cannot use another user's branch."
            )

        return branch
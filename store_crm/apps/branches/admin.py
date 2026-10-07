from django.contrib import admin

from .models import Branch, UserBranchRole


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "phone",
        "is_active",
        "created_at",
    )

    list_filter = (
        "is_active",
        "company",
    )

    search_fields = (
        "name",
        "address",
        "phone",
        "company__name",
    )

    ordering = (
        "-created_at",
    )


@admin.register(UserBranchRole)
class UserBranchRoleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "branch",
        "role",
    )

    list_filter = (
        "role",
        "branch",
    )

    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "branch__name",
    )

    autocomplete_fields = (
        "user",
        "branch",
    )
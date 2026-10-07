from django.contrib import admin

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "owner",
        "phone",
        "created_at",
    )

    search_fields = (
        "name",
        "phone",
        "owner__email",
    )

    list_filter = (
        "created_at",
    )

    ordering = (
        "-created_at",
    )
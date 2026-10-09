from django.contrib import admin

from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "first_name",
        "last_name",
        "phone",
        "company",
        "balance",
        "is_active",
    )
    list_filter = ("company", "is_active")
    search_fields = (
        "first_name",
        "last_name",
        "phone",
        "email",
    )
    autocomplete_fields = ("company",)
    readonly_fields = ("balance", "created_at", "updated_at")
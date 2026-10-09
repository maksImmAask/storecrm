from django.contrib import admin

from .models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "contact_person",
        "phone",
        "is_active",
    )
    list_filter = ("company", "is_active")
    search_fields = ("name", "phone", "email", "contact_person")
    autocomplete_fields = ("company",)
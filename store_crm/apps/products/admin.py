from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "parent",
        "created_at",
    )

    list_filter = (
        "company",
        "created_at",
    )

    search_fields = (
        "name",
        "company__name",
    )

    autocomplete_fields = (
        "company",
        "parent",
    )

    ordering = (
        "name",
    )


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "company",
        "category",
        "barcode",
        "sku",
        "purchase_price",
        "sale_price",
        "is_active",
        "created_at",
    )

    list_filter = (
        "company",
        "category",
        "is_active",
        "created_at",
    )

    search_fields = (
        "name",
        "barcode",
        "sku",
        "description",
        "company__name",
    )

    autocomplete_fields = (
        "company",
        "category",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )

    ordering = (
        "-created_at",
    )
from django.contrib import admin

from apps.sales.models import Sale, SaleItem


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 0
    autocomplete_fields = ("product",)


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "branch",
        "warehouse",
        "cashier",
        "customer",
        "status",
        "payment_type",
        "total_amount",
        "created_at",
    )
    list_filter = (
        "status",
        "payment_type",
        "branch",
        "created_at",
    )
    search_fields = (
        "customer__first_name",
        "customer__last_name",
        "customer__phone",
    )
    autocomplete_fields = (
        "branch",
        "warehouse",
        "cashier",
        "customer",
    )
    readonly_fields = (
        "subtotal",
        "total_amount",
        "created_at",
        "completed_at",
    )
    inlines = [SaleItemInline]
from apps.sales.models import SaleReturn, SaleReturnItem


class SaleReturnItemInline(admin.TabularInline):
    model = SaleReturnItem
    extra = 0
    autocomplete_fields = ("sale_item",)


@admin.register(SaleReturn)
class SaleReturnAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "sale",
        "warehouse",
        "status",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "created_at")
    autocomplete_fields = ("sale", "warehouse", "created_by")
    readonly_fields = ("created_at", "completed_at")
    inlines = [SaleReturnItemInline]
from django.contrib import admin
from .models import Sale, SaleItem




@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ("id", "sale", "product", "quantity")
    search_fields = ("sale__id", "product__name")
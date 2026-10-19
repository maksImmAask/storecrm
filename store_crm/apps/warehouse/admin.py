from django.contrib import admin

from apps.warehouse.models import (
    Stock,
    StockMovement,
    StockReceipt,
    StockReceiptItem,
    Warehouse,
)


@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "branch", "created_at")
    list_filter = ("branch",)
    search_fields = ("name", "address", "branch__name")
    autocomplete_fields = ("branch",)


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "warehouse",
        "product",
        "quantity",
        "reserved_quantity",
        "updated_at",
    )
    list_filter = ("warehouse",)
    search_fields = (
        "product__name",
        "product__barcode",
        "product__sku",
    )
    autocomplete_fields = ("warehouse", "product")
    readonly_fields = ("updated_at",)


class StockReceiptItemInline(admin.TabularInline):
    model = StockReceiptItem
    extra = 0
    autocomplete_fields = ("product",)


@admin.register(StockReceipt)
class StockReceiptAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "document_number",
        "warehouse",
        "status",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "warehouse")
    search_fields = ("document_number",)
    autocomplete_fields = ("warehouse", "created_by")
    readonly_fields = ("created_at", "completed_at")
    inlines = [StockReceiptItemInline]


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "warehouse",
        "product",
        "movement_type",
        "quantity",
        "quantity_before",
        "quantity_after",
        "created_by",
        "created_at",
    )
    list_filter = ("movement_type", "warehouse", "created_at")
    search_fields = (
        "product__name",
        "reference",
        "comment",
    )
    autocomplete_fields = (
        "warehouse",
        "product",
        "created_by",
    )
    readonly_fields = (
        "warehouse",
        "product",
        "movement_type",
        "quantity",
        "quantity_before",
        "quantity_after",
        "reference",
        "comment",
        "created_by",
        "created_at",
    )
from apps.warehouse.models import StockTransfer, StockTransferItem


class StockTransferItemInline(admin.TabularInline):
    model = StockTransferItem
    extra = 0
    autocomplete_fields = ("product",)


@admin.register(StockTransfer)
class StockTransferAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "source_warehouse",
        "destination_warehouse",
        "status",
        "created_by",
        "created_at",
    )
    list_filter = ("status", "created_at")
    autocomplete_fields = (
        "source_warehouse",
        "destination_warehouse",
        "created_by",
    )
    readonly_fields = ("created_at", "completed_at")
    inlines = [StockTransferItemInline]
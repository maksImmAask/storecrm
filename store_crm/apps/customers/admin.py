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
from django.contrib import admin

from apps.customers.models import Debt, DebtPayment


class DebtPaymentInline(admin.TabularInline):
    model = DebtPayment
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(Debt)
class DebtAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "customer",
        "sale",
        "original_amount",
        "remaining_amount",
        "status",
        "created_at",
    )
    list_filter = ("status", "created_at")
    search_fields = (
        "customer__first_name",
        "customer__last_name",
        "customer__phone",
    )
    readonly_fields = (
        "original_amount",
        "remaining_amount",
        "status",
        "created_at",
    )
    inlines = [DebtPaymentInline]


@admin.register(DebtPayment)
class DebtPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "debt", "amount", "received_by", "created_at")
    list_filter = ("created_at",)
    readonly_fields = ("created_at",)
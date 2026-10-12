from django.contrib import admin

from .models import Expense, ExpenseCategory


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "company", "is_active")
    list_filter = ("company", "is_active")
    search_fields = ("name",)
    autocomplete_fields = ("company",)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = (
        "id", "company", "branch", "category",
        "amount", "payment_method", "expense_date",
    )
    list_filter = ("company", "branch", "category", "payment_method")
    search_fields = ("description", "category__name")
    autocomplete_fields = ("company", "branch", "category", "created_by")
    readonly_fields = ("created_at",)
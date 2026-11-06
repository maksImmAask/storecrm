from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import Expense, ExpenseCategory
from .serializers import ExpenseCategorySerializer, ExpenseSerializer

from django.db import transaction

from apps.audit.services import log_action
def expense_audit_data(expense):
    return {
        "company_id": expense.company_id,
        "branch_id": expense.branch_id,
        "category_id": expense.category_id,
        "amount": str(expense.amount),
        "payment_method": expense.payment_method,
        "description": expense.description,
        "expense_date": expense.expense_date.isoformat(),
    }
class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExpenseCategory.objects.filter(
            company__owner=self.request.user
        ).select_related("company")

class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    filter_backends = [
        DjangoFilterBackend,
        SearchFilter,
        OrderingFilter,
    ]

    filterset_fields = [
        "branch",
        "category",
        "payment_method",
    ]

    search_fields = [
        "description",
        "category__name",
    ]

    ordering_fields = [
        "expense_date",
        "amount",
        "created_at",
    ]

    ordering = ["-expense_date"]

    def get_queryset(self):
        return Expense.objects.filter(
            company__owner=self.request.user
        ).select_related(
            "company",
            "branch",
            "category",
            "created_by",
        )

    def perform_create(self, serializer):
        expense = serializer.save(
            created_by=self.request.user
        )

        log_action(
            company=expense.company,
            user=self.request.user,
            action="expense.created",
            instance=expense,
            new_data=expense_audit_data(expense),
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    def perform_update(self, serializer):
        old_data = expense_audit_data(serializer.instance)

        expense = serializer.save()

        log_action(
            company=expense.company,
            user=self.request.user,
            action="expense.updated",
            instance=expense,
            old_data=old_data,
            new_data=expense_audit_data(expense),
            ip_address=self.request.META.get("REMOTE_ADDR"),
        )

    def perform_destroy(self, instance):
        with transaction.atomic():
            log_action(
                company=instance.company,
                user=self.request.user,
                action="expense.deleted",
                instance=instance,
                old_data=expense_audit_data(instance),
                ip_address=self.request.META.get("REMOTE_ADDR"),
            )

            instance.delete()
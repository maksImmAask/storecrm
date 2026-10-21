
from datetime import date
from decimal import Decimal
from types import SimpleNamespace

from django.test import TestCase
from rest_framework.test import APIRequestFactory
from rest_framework.exceptions import ErrorDetail

from apps.users.models import User
from apps.companies.models import Company
from apps.branches.models import Branch
from apps.finance.models import Expense, ExpenseCategory
from apps.finance.serializers import (
    ExpenseCategorySerializer,
    ExpenseSerializer,
)
from apps.finance.views import ExpenseViewSet


class FinanceTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="finance-owner@example.com",
            first_name="Finance",
            last_name="Owner",
            phone="+998901234567",
            password="test-password",
        )
        cls.other_user = User.objects.create_user(
            email="finance-other@example.com",
            first_name="Other",
            last_name="Owner",
            phone="+998902345678",
            password="test-password",
        )

        cls.company = Company.objects.create(
            name="Finance Company",
            owner=cls.user,
            phone="+998903456789",
            address="Test address",
        )
        cls.other_company = Company.objects.create(
            name="Other Finance Company",
            owner=cls.other_user,
            phone="+998904567890",
            address="Other address",
        )

        cls.branch = Branch.objects.create(
            company=cls.company,
            name="Finance Branch",
            address="Test address",
            phone="+998905678901",
        )
        cls.other_branch = Branch.objects.create(
            company=cls.other_company,
            name="Other Branch",
            address="Other address",
            phone="+998906789012",
        )

        cls.category = ExpenseCategory.objects.create(
            company=cls.company,
            name="Rent",
        )
        cls.other_category = ExpenseCategory.objects.create(
            company=cls.other_company,
            name="Other Rent",
        )

    def expense_data(self, **overrides):
        data = {
            "company": self.company.pk,
            "branch": self.branch.pk,
            "category": self.category.pk,
            "amount": "250.00",
            "payment_method": Expense.PaymentMethod.CASH,
            "description": "Monthly rent",
            "expense_date": "2026-10-21",
        }
        data.update(overrides)
        return data

    def make_serializer(self, user, data):
        request = SimpleNamespace(user=user)
        return ExpenseSerializer(
            data=data,
            context={"request": request},
        )

    def test_owner_can_create_expense(self):
        serializer = self.make_serializer(
            self.user,
            self.expense_data(),
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        expense = serializer.save()

        self.assertEqual(expense.company, self.company)
        self.assertEqual(expense.branch, self.branch)
        self.assertEqual(expense.category, self.category)
        self.assertEqual(expense.created_by, self.user)
        self.assertEqual(expense.amount, Decimal("250.00"))

    def test_cannot_create_expense_for_another_company(self):
        serializer = self.make_serializer(
            self.user,
            self.expense_data(
                company=self.other_company.pk,
                branch=self.other_branch.pk,
                category=self.other_category.pk,
            ),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("company", serializer.errors)

    def test_cannot_use_branch_from_another_company(self):
        serializer = self.make_serializer(
            self.user,
            self.expense_data(branch=self.other_branch.pk),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("branch", serializer.errors)

    def test_cannot_use_category_from_another_company(self):
        serializer = self.make_serializer(
            self.user,
            self.expense_data(category=self.other_category.pk),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("category", serializer.errors)

    def test_zero_amount_is_rejected(self):
        serializer = self.make_serializer(
            self.user,
            self.expense_data(amount="0.00"),
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("amount", serializer.errors)

    def test_category_from_another_company_is_rejected(self):
        serializer = ExpenseCategorySerializer(
            data={
                "company": self.other_company.pk,
                "name": "Unauthorized category",
            },
            context={"request": SimpleNamespace(user=self.user)},
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("company", serializer.errors)

    def test_expense_queryset_only_contains_owner_company_records(self):
        Expense.objects.create(
            company=self.company,
            branch=self.branch,
            category=self.category,
            amount=Decimal("100.00"),
            payment_method=Expense.PaymentMethod.CASH,
            description="My expense",
            expense_date=date(2026, 10, 20),
            created_by=self.user,
        )
        Expense.objects.create(
            company=self.other_company,
            branch=self.other_branch,
            category=self.other_category,
            amount=Decimal("200.00"),
            payment_method=Expense.PaymentMethod.CARD,
            description="Other expense",
            expense_date=date(2026, 10, 20),
            created_by=self.other_user,
        )

        request = APIRequestFactory().get("/api/expenses/")
        request.user = self.user

        view = ExpenseViewSet()
        view.request = SimpleNamespace(user=self.user)

        expenses = view.get_queryset()

        self.assertEqual(expenses.count(), 1)
        self.assertEqual(expenses.first().company, self.company)

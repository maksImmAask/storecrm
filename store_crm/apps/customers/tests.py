
from decimal import Decimal

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from apps.users.models import User
from apps.companies.models import Company
from apps.branches.models import Branch
from apps.warehouse.models import Warehouse
from apps.customers.models import Customer, Debt, DebtPayment
from apps.sales.models import Sale
from apps.customers.services import pay_debt


class PayDebtTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="owner@example.com",
            first_name="Test",
            last_name="Owner",
            phone="+998901111111",
            password="test-password",
        )

        cls.other_user = User.objects.create_user(
            email="other@example.com",
            first_name="Other",
            last_name="Owner",
            phone="+998902222222",
            password="test-password",
        )

        cls.company = Company.objects.create(
            name="Test Company",
            owner=cls.user,
            phone="+998903333333",
            address="Test address",
        )

        cls.branch = Branch.objects.create(
            company=cls.company,
            name="Main Branch",
            address="Branch address",
            phone="+998904444444",
        )

        cls.warehouse = Warehouse.objects.create(
            branch=cls.branch,
            name="Main Warehouse",
        )

    def setUp(self):
        self.customer = Customer.objects.create(
            company=self.company,
            first_name="Test",
            last_name="Customer",
            balance=Decimal("100.00"),
        )

        self.sale = Sale.objects.create(
            branch=self.branch,
            warehouse=self.warehouse,
            cashier=self.user,
            customer=self.customer,
            status=Sale.Status.COMPLETED,
            payment_type=Sale.PaymentType.DEBT,
            subtotal=Decimal("100.00"),
            total_amount=Decimal("100.00"),
            paid_amount=Decimal("0.00"),
        )

        self.debt = Debt.objects.create(
            customer=self.customer,
            sale=self.sale,
            original_amount=Decimal("100.00"),
            remaining_amount=Decimal("100.00"),
        )

    def test_partial_payment(self):
        debt = pay_debt(
            self.debt.id,
            Decimal("30.00"),
            self.user,
        )

        self.assertEqual(debt.remaining_amount, Decimal("70.00"))
        self.assertEqual(debt.status, Debt.Status.PARTIALLY_PAID)
        self.assertEqual(
            DebtPayment.objects.filter(debt=debt).count(), 1
        )

        self.customer.refresh_from_db()
        self.assertEqual(self.customer.balance, Decimal("70.00"))

    def test_full_payment(self):
        debt = pay_debt(
            self.debt.id,
            Decimal("100.00"),
            self.user,
        )

        self.assertEqual(debt.remaining_amount, Decimal("0.00"))
        self.assertEqual(debt.status, Debt.Status.PAID)

    def test_payment_exceeding_debt_is_rejected(self):
        with self.assertRaises(ValidationError):
            pay_debt(self.debt.id, Decimal("150.00"), self.user)

        self.assertEqual(
            DebtPayment.objects.filter(debt=self.debt).count(), 0
        )

    def test_zero_payment_is_rejected(self):
        with self.assertRaises(ValidationError):
            pay_debt(self.debt.id, Decimal("0.00"), self.user)

    def test_negative_payment_is_rejected(self):
        with self.assertRaises(ValidationError):
            pay_debt(self.debt.id, Decimal("-10.00"), self.user)

    def test_payment_by_another_user_is_rejected(self):
        with self.assertRaises(ValidationError):
            pay_debt(
                self.debt.id,
                Decimal("20.00"),
                self.other_user,
            )

        self.assertEqual(
            DebtPayment.objects.filter(debt=self.debt).count(), 0
        )

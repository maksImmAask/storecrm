from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.users.models import User
from apps.companies.models import Company
from apps.branches.models import Branch
from apps.products.models import Category, Product
from apps.warehouse.models import Warehouse, Stock


class StockConstraintTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create(
            email="stock-test@example.com",
            phone="+998900000001",
            first_name="Stock",
            last_name="Tester",
            password="test-password",
        )

        cls.company = Company.objects.create(
            name="Test Company",
            owner=cls.user,
            phone="+998900000002",
            address="Test address",
        )

        cls.branch = Branch.objects.create(
            company=cls.company,
            name="Test Branch",
            address="Test address",
            phone="+998900000003",
        )

        cls.category = Category.objects.create(
            company=cls.company,
            name="Test Category",
        )

        cls.product = Product.objects.create(
            company=cls.company,
            category=cls.category,
            name="Test Product",
            purchase_price=Decimal("10.00"),
            sale_price=Decimal("15.00"),
        )

        cls.warehouse = Warehouse.objects.create(
            branch=cls.branch,
            name="Test Warehouse",
        )

    def test_stock_is_created_with_zero_quantity(self):
        stock = Stock.objects.create(
            warehouse=self.warehouse,
            product=self.product,
        )

        self.assertEqual(stock.quantity, Decimal("0"))
        self.assertEqual(stock.reserved_quantity, Decimal("0"))

    def test_stock_quantity_cannot_be_negative(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Stock.objects.create(
                    warehouse=self.warehouse,
                    product=self.product,
                    quantity=Decimal("-1"),
                )

    def test_reserved_quantity_cannot_be_negative(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Stock.objects.create(
                    warehouse=self.warehouse,
                    product=self.product,
                    quantity=Decimal("5"),
                    reserved_quantity=Decimal("-1"),
                )

    def test_reserved_quantity_cannot_exceed_quantity(self):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Stock.objects.create(
                    warehouse=self.warehouse,
                    product=self.product,
                    quantity=Decimal("5"),
                    reserved_quantity=Decimal("6"),
                )

    def test_only_one_stock_record_per_warehouse_and_product(self):
        Stock.objects.create(
            warehouse=self.warehouse,
            product=self.product,
            quantity=Decimal("10"),
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Stock.objects.create(
                    warehouse=self.warehouse,
                    product=self.product,
                    quantity=Decimal("20"),
                )

    def test_stock_quantity_is_saved(self):
        stock = Stock.objects.create(
            warehouse=self.warehouse,
            product=self.product,
            quantity=Decimal("1.500"),
        )

        stock.refresh_from_db()
        self.assertEqual(stock.quantity, Decimal("1.500"))

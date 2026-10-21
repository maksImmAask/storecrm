from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.users.models import User
from apps.companies.models import Company
from apps.products.models import Category, Product


class ProductAndCategoryTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create(
            email="products-test@example.com",
            phone="+998900001001",
            first_name="Product",
            last_name="Tester",
            password="test-password",
        )
        cls.company = Company.objects.create(
            name="Products Test Company",
            owner=cls.user,
            phone="+998900001002",
            address="Test address",
        )
        cls.category = Category.objects.create(
            company=cls.company,
            name="Drinks",
        )

    def make_product(self, **overrides):
        values = {
            "company": self.company,
            "category": self.category,
            "name": "Orange Juice",
            "purchase_price": Decimal("10.00"),
            "sale_price": Decimal("15.00"),
            "sku": "JUICE-001",
            "barcode": "123456789001",
        }
        values.update(overrides)
        return Product.objects.create(**values)

    def test_category_is_created(self):
        self.assertEqual(self.category.name, "Drinks")
        self.assertEqual(self.category.company, self.company)

    def test_duplicate_child_category_name_is_rejected(self):
        parent = Category.objects.create(
            company=self.company,
            name="Beverages",
        )
        Category.objects.create(
            company=self.company,
            name="Juice",
            parent=parent,
        )
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Category.objects.create(
                    company=self.company,
                    name="Juice",
                    parent=parent,
                )

    def test_product_is_created_with_prices(self):
        product = self.make_product()
        self.assertEqual(product.purchase_price, Decimal("10.00"))
        self.assertEqual(product.sale_price, Decimal("15.00"))
        self.assertTrue(product.is_active)

    def test_duplicate_sku_in_same_company_is_rejected(self):
        self.make_product()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_product(name="Another Juice")

    def test_duplicate_barcode_in_same_company_is_rejected(self):
        self.make_product()
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                self.make_product(
                    sku="JUICE-002",
                    name="Another Juice",
                )

    def test_same_sku_is_allowed_in_another_company(self):
        another_user = User.objects.create(
            email="products-test-2@example.com",
            phone="+998900001003",
            first_name="Second",
            last_name="Tester",
            password="test-password",
        )
        another_company = Company.objects.create(
            name="Another Products Company",
            owner=another_user,
            phone="+998900001004",
            address="Another address",
        )
        another_category = Category.objects.create(
            company=another_company,
            name="Drinks",
        )
        product = Product.objects.create(
            company=another_company,
            category=another_category,
            name="Other Juice",
            purchase_price=Decimal("11.00"),
            sale_price=Decimal("16.00"),
            sku="JUICE-001",
        )
        self.assertEqual(product.sku, "JUICE-001")

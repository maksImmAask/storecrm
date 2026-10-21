
from decimal import Decimal

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from apps.users.models import User
from apps.companies.models import Company
from apps.branches.models import Branch
from apps.warehouse.models import Warehouse, Stock, StockMovement
from apps.products.models import Category, Product
from apps.sales.models import Sale, SaleItem
from apps.sales.services import complete_sale


class CompleteSaleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="sales-owner@example.com",
            first_name="Sales",
            last_name="Owner",
            phone="+998901234567",
            password="test-password",
        )
        cls.other_user = User.objects.create_user(
            email="other-owner@example.com",
            first_name="Other",
            last_name="Owner",
            phone="+998901234568",
            password="test-password",
        )
        cls.company = Company.objects.create(
            name="Sales Test Company",
            owner=cls.user,
            phone="+998901234569",
            address="Test address",
        )
        cls.branch = Branch.objects.create(
            company=cls.company,
            name="Main Branch",
            address="Branch address",
            phone="+998901234570",
        )
        cls.warehouse = Warehouse.objects.create(
            branch=cls.branch,
            name="Main Warehouse",
        )
        cls.category = Category.objects.create(
            company=cls.company,
            name="Test Category",
        )
        cls.product = Product.objects.create(
            company=cls.company,
            category=cls.category,
            name="Test Product",
            purchase_price=Decimal("4.00"),
            sale_price=Decimal("10.00"),
        )

    def setUp(self):
        self.stock = Stock.objects.create(
            warehouse=self.warehouse,
            product=self.product,
            quantity=Decimal("10.000"),
        )
        self.sale = Sale.objects.create(
            branch=self.branch,
            warehouse=self.warehouse,
            cashier=self.user,
            status=Sale.Status.DRAFT,
            payment_type=Sale.PaymentType.CASH,
            paid_amount=Decimal("20.00"),
        )
        self.item = SaleItem.objects.create(
            sale=self.sale,
            product=self.product,
            quantity=Decimal("2.000"),
            unit_price=Decimal("0.00"),
            unit_cost=Decimal("0.00"),
            line_total=Decimal("0.00"),
        )

    def test_successful_sale_updates_stock_and_movement(self):
        sale = complete_sale(self.sale.id, self.user)

        self.stock.refresh_from_db()
        self.item.refresh_from_db()

        self.assertEqual(sale.status, Sale.Status.COMPLETED)
        self.assertEqual(sale.subtotal, Decimal("20.00"))
        self.assertEqual(sale.total_amount, Decimal("20.00"))
        self.assertEqual(self.stock.quantity, Decimal("8.000"))
        self.assertEqual(self.item.unit_price, Decimal("10.00"))
        self.assertEqual(self.item.unit_cost, Decimal("4.00"))
        self.assertEqual(self.item.line_total, Decimal("20.00"))

        movement = StockMovement.objects.get(
            reference=f"SALE-{sale.id}"
        )
        self.assertEqual(
            movement.movement_type,
            StockMovement.MovementType.SALE,
        )
        self.assertEqual(movement.quantity, Decimal("2.000"))
        self.assertEqual(movement.quantity_before, Decimal("10.000"))
        self.assertEqual(movement.quantity_after, Decimal("8.000"))

    def test_insufficient_stock_is_rejected(self):
        self.stock.quantity = Decimal("1.000")
        self.stock.save()

        with self.assertRaises(ValidationError):
            complete_sale(self.sale.id, self.user)

        self.stock.refresh_from_db()
        self.sale.refresh_from_db()

        self.assertEqual(self.stock.quantity, Decimal("1.000"))
        self.assertEqual(self.sale.status, Sale.Status.DRAFT)
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_sale_cannot_be_completed_by_another_company_owner(self):
        with self.assertRaises(ValidationError):
            complete_sale(self.sale.id, self.other_user)

        self.stock.refresh_from_db()
        self.sale.refresh_from_db()

        self.assertEqual(self.stock.quantity, Decimal("10.000"))
        self.assertEqual(self.sale.status, Sale.Status.DRAFT)
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_sale_without_items_is_rejected(self):
        self.item.delete()

        with self.assertRaises(ValidationError):
            complete_sale(self.sale.id, self.user)

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantity, Decimal("10.000"))
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_completed_sale_cannot_be_completed_again(self):
        complete_sale(self.sale.id, self.user)

        with self.assertRaises(ValidationError):
            complete_sale(self.sale.id, self.user)

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantity, Decimal("8.000"))
        self.assertEqual(StockMovement.objects.count(), 1)

    def test_failed_sale_rolls_back_stock_changes(self):
        # Общая скидка больше стоимости товаров.
        self.sale.discount_amount = Decimal("30.00")
        self.sale.save(update_fields=["discount_amount"])

        with self.assertRaises(ValidationError):
            complete_sale(self.sale.id, self.user)

        self.stock.refresh_from_db()
        self.sale.refresh_from_db()
        self.item.refresh_from_db()

        self.assertEqual(self.stock.quantity, Decimal("10.000"))
        self.assertEqual(self.sale.status, Sale.Status.DRAFT)
        self.assertEqual(self.item.unit_price, Decimal("0.00"))
        self.assertEqual(StockMovement.objects.count(), 0)

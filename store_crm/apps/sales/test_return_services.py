
from decimal import Decimal

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from apps.users.models import User
from apps.companies.models import Company
from apps.branches.models import Branch
from apps.products.models import Category, Product
from apps.warehouse.models import Warehouse, Stock, StockMovement
from apps.sales.models import Sale, SaleItem, SaleReturn, SaleReturnItem
from apps.sales.return_services import complete_return


class CompleteReturnTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="return-owner@example.com",
            first_name="Return",
            last_name="Owner",
            phone="+998901111111",
            password="test-password",
        )
        cls.other_user = User.objects.create_user(
            email="return-other@example.com",
            first_name="Other",
            last_name="Owner",
            phone="+998902222222",
            password="test-password",
        )
        cls.company = Company.objects.create(
            name="Return Test Company",
            owner=cls.user,
            phone="+998903333333",
            address="Test address",
        )
        cls.branch = Branch.objects.create(
            company=cls.company,
            name="Return Branch",
            address="Test address",
            phone="+998904444444",
        )
        cls.warehouse = Warehouse.objects.create(
            branch=cls.branch,
            name="Return Warehouse",
        )
        cls.category = Category.objects.create(
            company=cls.company,
            name="Return Category",
        )
        cls.product = Product.objects.create(
            company=cls.company,
            category=cls.category,
            name="Return Product",
            purchase_price=Decimal("4.00"),
            sale_price=Decimal("10.00"),
        )

    def setUp(self):
        self.stock = Stock.objects.create(
            warehouse=self.warehouse,
            product=self.product,
            quantity=Decimal("8.000"),
        )
        self.sale = Sale.objects.create(
            branch=self.branch,
            warehouse=self.warehouse,
            cashier=self.user,
            status=Sale.Status.COMPLETED,
            payment_type=Sale.PaymentType.CASH,
            subtotal=Decimal("20.00"),
            total_amount=Decimal("20.00"),
            paid_amount=Decimal("20.00"),
        )
        self.sale_item = SaleItem.objects.create(
            sale=self.sale,
            product=self.product,
            quantity=Decimal("2.000"),
            unit_price=Decimal("10.00"),
            unit_cost=Decimal("4.00"),
            line_total=Decimal("20.00"),
        )
        self.sale_return = SaleReturn.objects.create(
            sale=self.sale,
            warehouse=self.warehouse,
            created_by=self.user,
            reason="Customer returned product",
        )
        self.return_item = SaleReturnItem.objects.create(
            sale_return=self.sale_return,
            sale_item=self.sale_item,
            quantity=Decimal("1.000"),
        )

    def test_successful_return_restores_stock_and_creates_movement(self):
        result = complete_return(self.sale_return.id, self.user)

        self.stock.refresh_from_db()
        self.sale_return.refresh_from_db()

        self.assertEqual(result.status, SaleReturn.Status.COMPLETED)
        self.assertIsNotNone(result.completed_at)
        self.assertEqual(self.stock.quantity, Decimal("9.000"))

        movement = StockMovement.objects.get(
            reference=f"RETURN-{self.sale_return.id}"
        )
        self.assertEqual(
            movement.movement_type,
            StockMovement.MovementType.RETURN,
        )
        self.assertEqual(movement.quantity, Decimal("1.000"))
        self.assertEqual(movement.quantity_before, Decimal("8.000"))
        self.assertEqual(movement.quantity_after, Decimal("9.000"))

    def test_cannot_return_more_than_sold_quantity(self):
        self.return_item.quantity = Decimal("3.000")
        self.return_item.save(update_fields=["quantity"])

        with self.assertRaises(ValidationError):
            complete_return(self.sale_return.id, self.user)

        self.stock.refresh_from_db()
        self.sale_return.refresh_from_db()

        self.assertEqual(self.stock.quantity, Decimal("8.000"))
        self.assertEqual(self.sale_return.status, SaleReturn.Status.DRAFT)
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_cannot_return_quantity_already_returned(self):
        previous_return = SaleReturn.objects.create(
            sale=self.sale,
            warehouse=self.warehouse,
            created_by=self.user,
            status=SaleReturn.Status.COMPLETED,
            reason="Previous return",
        )
        SaleReturnItem.objects.create(
            sale_return=previous_return,
            sale_item=self.sale_item,
            quantity=Decimal("1.000"),
        )

        self.return_item.quantity = Decimal("2.000")
        self.return_item.save(update_fields=["quantity"])

        with self.assertRaises(ValidationError):
            complete_return(self.sale_return.id, self.user)

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantity, Decimal("8.000"))
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_another_company_owner_cannot_complete_return(self):
        with self.assertRaises(ValidationError):
            complete_return(self.sale_return.id, self.other_user)

        self.stock.refresh_from_db()
        self.sale_return.refresh_from_db()

        self.assertEqual(self.stock.quantity, Decimal("8.000"))
        self.assertEqual(self.sale_return.status, SaleReturn.Status.DRAFT)
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_return_without_items_is_rejected(self):
        self.return_item.delete()

        with self.assertRaises(ValidationError):
            complete_return(self.sale_return.id, self.user)

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantity, Decimal("8.000"))
        self.assertEqual(StockMovement.objects.count(), 0)

    def test_completed_return_cannot_be_completed_again(self):
        complete_return(self.sale_return.id, self.user)

        with self.assertRaises(ValidationError):
            complete_return(self.sale_return.id, self.user)

        self.stock.refresh_from_db()
        self.assertEqual(self.stock.quantity, Decimal("9.000"))
        self.assertEqual(StockMovement.objects.count(), 1)

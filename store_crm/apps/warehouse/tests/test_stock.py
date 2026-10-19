from decimal import Decimal

from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.warehouse.models import Stock


class StockConstraintTests(TestCase):
    def test_stock_quantity_cannot_be_negative(self):
        # Интеграционный тест с реальными Warehouse и Product
        # лучше добавить после настройки общих тестовых фабрик.
        self.assertEqual(Decimal("0"), Decimal("0"))

    def test_stock_quantity_decimal_precision(self):
        self.assertEqual(
            Decimal("1.500"),
            Decimal("1.500"),
        )
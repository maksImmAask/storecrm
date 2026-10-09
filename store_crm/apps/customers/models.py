from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Customer(models.Model):
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="customers",
    )
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    balance = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "customers"
        ordering = ["first_name", "last_name"]
        indexes = [
            models.Index(
                fields=["company", "phone"],
                name="customer_company_phone_idx",
            ),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}".strip()
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from apps.companies.models import Company


class Category(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="categories",
    )
    name = models.CharField(max_length=255)
    parent = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="children",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "categories"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["company", "name", "parent"],
                name="unique_category_per_parent",
            ),
        ]

    def __str__(self):
        if self.parent:
            return f"{self.parent.name} → {self.name}"
        return self.name


class Product(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="products",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="products",
    )

    name = models.CharField(max_length=255)

    barcode = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    sku = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
    )

    purchase_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0")),
        ],
    )

    sale_price = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal("0")),
        ],
    )

    description = models.TextField(
        blank=True,
    )

    image = models.ImageField(
        upload_to="products/",
        blank=True,
        null=True,
    )

    is_active = models.BooleanField(
        default=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "products"
        ordering = ["-created_at"]

        constraints = [
            models.UniqueConstraint(
                fields=["company", "barcode"],
                condition=~models.Q(barcode=""),
                name="unique_product_barcode_per_company",
            ),
            models.UniqueConstraint(
                fields=["company", "sku"],
                condition=~models.Q(sku=""),
                name="unique_product_sku_per_company",
            ),
        ]

    def __str__(self):
        return self.name
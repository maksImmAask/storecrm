from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Warehouse(models.Model):
    branch = models.ForeignKey(
        "branches.Branch",
        on_delete=models.CASCADE,
        related_name="warehouses",
    )
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "warehouses"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["branch", "name"],
                name="unique_warehouse_name_per_branch",
            ),
        ]

    def __str__(self):
        return f"{self.branch.name} — {self.name}"


class Stock(models.Model):
    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.CASCADE,
        related_name="stocks",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="stocks",
    )
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
    )
    reserved_quantity = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        default=0,
        validators=[MinValueValidator(0)],
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stocks"
        constraints = [
            models.UniqueConstraint(
                fields=["warehouse", "product"],
                name="unique_stock_per_warehouse_product",
            ),
            models.CheckConstraint(
                condition=Q(quantity__gte=0),
                name="stock_quantity_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(reserved_quantity__gte=0),
                name="stock_reserved_nonnegative",
            ),
            models.CheckConstraint(
                condition=Q(reserved_quantity__lte=models.F("quantity")),
                name="stock_reserved_not_above_quantity",
            ),
        ]

    @property
    def available_quantity(self):
        return self.quantity - self.reserved_quantity

    def __str__(self):
        return f"{self.product.name}: {self.quantity}"


class StockMovement(models.Model):
    class MovementType(models.TextChoices):
        RECEIPT = "receipt", "Receipt"
        SALE = "sale", "Sale"
        RETURN = "return", "Return"
        TRANSFER_IN = "transfer_in", "Transfer in"
        TRANSFER_OUT = "transfer_out", "Transfer out"
        CORRECTION = "correction", "Correction"

    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="movements",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MovementType.choices,
    )
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        validators=[MinValueValidator(0)],
    )
    quantity_before = models.DecimalField(
        max_digits=14,
        decimal_places=3,
    )
    quantity_after = models.DecimalField(
        max_digits=14,
        decimal_places=3,
    )
    reference = models.CharField(
        max_length=100,
        blank=True,
    )
    comment = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_movements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stock_movements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["warehouse", "product", "created_at"],
                name="movement_stock_date_idx",
            ),
            models.Index(
                fields=["movement_type", "created_at"],
                name="movement_type_date_idx",
            ),
        ]

    def __str__(self):
        return (
            f"{self.get_movement_type_display()} — "
            f"{self.product.name} — {self.quantity}"
        )


class StockReceipt(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="receipts",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    document_number = models.CharField(max_length=100)
    comment = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_receipts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "stock_receipts"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["warehouse", "document_number"],
                name="unique_receipt_number_per_warehouse",
            ),
        ]

    def __str__(self):
        return self.document_number


class StockReceiptItem(models.Model):
    receipt = models.ForeignKey(
        StockReceipt,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="receipt_items",
    )
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )
    unit_cost = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        validators=[MinValueValidator(0)],
    )

    class Meta:
        db_table = "stock_receipt_items"
        constraints = [
            models.UniqueConstraint(
                fields=["receipt", "product"],
                name="unique_product_per_receipt",
            ),
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="receipt_item_quantity_positive",
            ),
        ]

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"
class StockTransfer(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    source_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="outgoing_transfers",
    )
    destination_warehouse = models.ForeignKey(
        Warehouse,
        on_delete=models.PROTECT,
        related_name="incoming_transfers",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="stock_transfers",
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "stock_transfers"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Transfer #{self.pk}"


class StockTransferItem(models.Model):
    transfer = models.ForeignKey(
        StockTransfer,
        on_delete=models.CASCADE,
        related_name="items",
    )
    product = models.ForeignKey(
        "products.Product",
        on_delete=models.PROTECT,
        related_name="transfer_items",
    )
    quantity = models.DecimalField(
        max_digits=14,
        decimal_places=3,
        validators=[MinValueValidator(0.001)],
    )

    class Meta:
        db_table = "stock_transfer_items"
        constraints = [
            models.UniqueConstraint(
                fields=["transfer", "product"],
                name="unique_product_per_transfer",
            ),
            models.CheckConstraint(
                condition=Q(quantity__gt=0),
                name="transfer_item_quantity_positive",
            ),
        ]
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.warehouse.models import (
    Stock,
    StockMovement,
    StockReceipt,
)


@transaction.atomic
def complete_receipt(receipt_id, user):
    receipt = (
        StockReceipt.objects
        .select_for_update()
        .select_related(
            "warehouse",
            "warehouse__branch",
            "warehouse__branch__company",
        )
        .get(pk=receipt_id)
    )

    if receipt.status != StockReceipt.Status.DRAFT:
        raise ValidationError(
            {"status": "Only draft receipts can be completed."}
        )

    company = receipt.warehouse.branch.company

    if company.owner_id != user.id:
        raise ValidationError(
            "You do not have permission to complete this receipt."
        )

    items = list(
        receipt.items
        .select_related("product")
        .order_by("product_id")
    )

    if not items:
        raise ValidationError(
            "A receipt must contain at least one item."
        )

    for item in items:
        if item.product.company_id != company.id:
            raise ValidationError(
                f"Product '{item.product.name}' belongs to another company."
            )

    for item in items:
        stock, _ = Stock.objects.get_or_create(
            warehouse=receipt.warehouse,
            product=item.product,
            defaults={
                "quantity": 0,
                "reserved_quantity": 0,
            },
        )

        stock = (
            Stock.objects
            .select_for_update()
            .get(pk=stock.pk)
        )

        quantity_before = stock.quantity
        stock.quantity += item.quantity
        stock.save(
            update_fields=["quantity", "updated_at"]
        )

        StockMovement.objects.create(
            warehouse=receipt.warehouse,
            product=item.product,
            movement_type=StockMovement.MovementType.RECEIPT,
            quantity=item.quantity,
            quantity_before=quantity_before,
            quantity_after=stock.quantity,
            reference=receipt.document_number,
            comment=receipt.comment,
            created_by=user,
        )

    receipt.status = StockReceipt.Status.COMPLETED
    receipt.completed_at = timezone.now()
    receipt.save(
        update_fields=["status", "completed_at"]
    )

    return receipt
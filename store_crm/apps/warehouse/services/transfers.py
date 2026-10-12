from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.warehouse.models import (
    Stock,
    StockMovement,
    StockTransfer,
)


@transaction.atomic
def complete_transfer(transfer_id, user):
    transfer = (
        StockTransfer.objects.select_for_update()
        .select_related(
            "source_warehouse__branch__company",
            "destination_warehouse__branch__company",
        )
        .get(pk=transfer_id)
    )

    if transfer.status not in (
        StockTransfer.Status.DRAFT,
        StockTransfer.Status.IN_PROGRESS,
    ):
        raise ValidationError("This transfer cannot be completed.")

    source = transfer.source_warehouse
    destination = transfer.destination_warehouse

    if source.id == destination.id:
        raise ValidationError("Source and destination must differ.")

    company = source.branch.company

    if company.owner_id != user.id:
        raise ValidationError("Access denied.")

    if destination.branch.company_id != company.id:
        raise ValidationError(
            "Both warehouses must belong to the same company."
        )

    items = list(
        transfer.items.select_related("product").order_by("product_id")
    )

    if not items:
        raise ValidationError("Transfer must contain items.")

    locked = []

    for item in items:
        if item.product.company_id != company.id:
            raise ValidationError("Product belongs to another company.")

        try:
            stock = Stock.objects.select_for_update().get(
                warehouse=source,
                product=item.product,
            )
        except Stock.DoesNotExist:
            raise ValidationError(
                f"No source stock for '{item.product.name}'."
            )

        if stock.quantity - stock.reserved_quantity < item.quantity:
            raise ValidationError(
                f"Insufficient available stock for '{item.product.name}'."
            )

        locked.append((item, stock))

    for item, source_stock in locked:
        destination_stock, _ = Stock.objects.get_or_create(
            warehouse=destination,
            product=item.product,
            defaults={"quantity": 0, "reserved_quantity": 0},
        )
        destination_stock = Stock.objects.select_for_update().get(
            pk=destination_stock.pk
        )

        source_before = source_stock.quantity
        destination_before = destination_stock.quantity

        source_stock.quantity -= item.quantity
        destination_stock.quantity += item.quantity

        source_stock.save(update_fields=["quantity", "updated_at"])
        destination_stock.save(update_fields=["quantity", "updated_at"])

        StockMovement.objects.create(
            warehouse=source,
            product=item.product,
            movement_type=StockMovement.MovementType.TRANSFER_OUT,
            quantity=item.quantity,
            quantity_before=source_before,
            quantity_after=source_stock.quantity,
            reference=f"TRANSFER-{transfer.pk}",
            comment=transfer.comment,
            created_by=user,
        )

        StockMovement.objects.create(
            warehouse=destination,
            product=item.product,
            movement_type=StockMovement.MovementType.TRANSFER_IN,
            quantity=item.quantity,
            quantity_before=destination_before,
            quantity_after=destination_stock.quantity,
            reference=f"TRANSFER-{transfer.pk}",
            comment=transfer.comment,
            created_by=user,
        )

    transfer.status = StockTransfer.Status.COMPLETED
    transfer.completed_at = timezone.now()
    transfer.save(update_fields=["status", "completed_at"])

    return transfer
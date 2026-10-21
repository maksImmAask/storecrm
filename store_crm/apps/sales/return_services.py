from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.sales.models import Sale, SaleReturn, SaleReturnItem
from apps.warehouse.models import Stock, StockMovement


@transaction.atomic
def complete_return(return_id, user):
    sale_return = (
        SaleReturn.objects.select_for_update(of=("self",))
        .select_related(
            "sale",
            "sale__branch__company",
            "warehouse",
            "warehouse__branch__company",
        )
        .get(pk=return_id)
    )

    if sale_return.status != SaleReturn.Status.DRAFT:
        raise ValidationError("Only draft returns can be completed.")

    if sale_return.sale.status != Sale.Status.COMPLETED:
        raise ValidationError("Only completed sales can be returned.")

    company = sale_return.sale.branch.company

    if company.owner_id != user.id:
        raise ValidationError("Access denied.")

    if sale_return.warehouse.branch.company_id != company.id:
        raise ValidationError("Warehouse belongs to another company.")

    items = list(
        sale_return.items.select_related(
            "sale_item", "sale_item__product"
        ).order_by("sale_item__product_id")
    )

    if not items:
        raise ValidationError("Return must contain at least one item.")

    for item in items:
        if item.sale_item.sale_id != sale_return.sale_id:
            raise ValidationError("Return item belongs to another sale.")

        already_returned = (
            SaleReturnItem.objects.filter(
                sale_item=item.sale_item,
                sale_return__status=SaleReturn.Status.COMPLETED,
            ).exclude(
                sale_return_id=sale_return.id
            ).aggregate(total=Sum("quantity"))["total"]
            or Decimal("0")
        )

        if already_returned + item.quantity > item.sale_item.quantity:
            raise ValidationError(
                f"Return quantity exceeds sold quantity for "
                f"'{item.sale_item.product.name}'."
            )

    for item in items:
        product = item.sale_item.product

        stock, _ = Stock.objects.get_or_create(
            warehouse=sale_return.warehouse,
            product=product,
            defaults={"quantity": 0, "reserved_quantity": 0},
        )
        stock = Stock.objects.select_for_update().get(pk=stock.pk)

        before = stock.quantity
        stock.quantity += item.quantity
        stock.save(update_fields=["quantity", "updated_at"])

        StockMovement.objects.create(
            warehouse=sale_return.warehouse,
            product=product,
            movement_type=StockMovement.MovementType.RETURN,
            quantity=item.quantity,
            quantity_before=before,
            quantity_after=stock.quantity,
            reference=f"RETURN-{sale_return.id}",
            comment=sale_return.reason,
            created_by=user,
        )

    sale_return.status = SaleReturn.Status.COMPLETED
    sale_return.completed_at = timezone.now()
    sale_return.save(update_fields=["status", "completed_at"])

    return sale_return
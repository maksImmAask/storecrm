from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.sales.models import Sale
from apps.warehouse.models import Stock, StockMovement


@transaction.atomic
def complete_sale(sale_id, user):
    sale = (
        Sale.objects
        .select_for_update()
        .select_related(
            "branch",
            "branch__company",
            "warehouse",
            "warehouse__branch",
            "warehouse__branch__company",
            "customer",
        )
        .get(pk=sale_id)
    )

    if sale.status != Sale.Status.DRAFT:
        raise ValidationError(
            {"status": "Only draft sales can be completed."}
        )

    company = sale.branch.company

    if company.owner_id != user.id:
        raise ValidationError(
            "You cannot complete sales for another company."
        )

    if sale.warehouse.branch_id != sale.branch_id:
        raise ValidationError(
            "The warehouse must belong to the sale branch."
        )

    if sale.customer_id and sale.customer.company_id != company.id:
        raise ValidationError(
            "The customer belongs to another company."
        )

    items = list(
        sale.items
        .select_related("product")
        .order_by("product_id")
    )

    if not items:
        raise ValidationError("A sale must contain at least one item.")

    subtotal = Decimal("0.00")
    total_cost = Decimal("0.00")
    locked_stocks = []

    # Блокируем остатки в стабильном порядке, чтобы уменьшить
    # вероятность взаимных блокировок при параллельных продажах.
    for item in items:
        if item.product.company_id != company.id:
            raise ValidationError(
                f"Product '{item.product.name}' belongs to another company."
            )

        try:
            stock = (
                Stock.objects
                .select_for_update()
                .get(
                    warehouse=sale.warehouse,
                    product=item.product,
                )
            )
        except Stock.DoesNotExist:
            raise ValidationError(
                f"No stock exists for '{item.product.name}'."
            )

        if stock.quantity - stock.reserved_quantity < item.quantity:
            raise ValidationError(
                {
                    "stock": (
                        f"Insufficient available stock for "
                        f"'{item.product.name}'."
                    )
                }
            )

        locked_stocks.append((item, stock))

    for item, stock in locked_stocks:
        quantity_before = stock.quantity

        # Стоимость берём из цены продажи и текущей закупочной цены.
        # FIFO-себестоимость подключим отдельным этапом через StockBatch.
        item.unit_price = item.product.sale_price
        item.unit_cost = item.product.purchase_price
        item.line_total = (
            item.unit_price * item.quantity - item.discount_amount
        )

        if item.line_total < 0:
            raise ValidationError(
                f"Discount exceeds line amount for '{item.product.name}'."
            )

        subtotal += item.unit_price * item.quantity
        total_cost += item.unit_cost * item.quantity

        stock.quantity -= item.quantity
        stock.save(update_fields=["quantity", "updated_at"])

        item.save(
            update_fields=[
                "unit_price",
                "unit_cost",
                "line_total",
            ]
        )

        StockMovement.objects.create(
            warehouse=sale.warehouse,
            product=item.product,
            movement_type=StockMovement.MovementType.SALE,
            quantity=item.quantity,
            quantity_before=quantity_before,
            quantity_after=stock.quantity,
            reference=f"SALE-{sale.pk}",
            comment=f"Sale #{sale.pk}",
            created_by=user,
        )

    total = subtotal - sale.discount_amount

    if total < 0:
        raise ValidationError(
            {"discount_amount": "Discount exceeds sale subtotal."}
        )

    if sale.paid_amount > total:
        raise ValidationError(
            {"paid_amount": "Paid amount cannot exceed total amount."}
        )

    if sale.payment_type == Sale.PaymentType.DEBT and not sale.customer_id:
        raise ValidationError(
            {"customer": "A customer is required for a debt sale."}
        )

    if sale.payment_type != Sale.PaymentType.DEBT:
        if sale.paid_amount != total:
            raise ValidationError(
                {"paid_amount": "The sale must be fully paid."}
            )

    if sale.customer_id and sale.paid_amount < total:
        sale.customer.balance += total - sale.paid_amount
        sale.customer.save(update_fields=["balance", "updated_at"])

    sale.subtotal = subtotal
    sale.total_amount = total
    sale.status = Sale.Status.COMPLETED
    sale.completed_at = timezone.now()
    sale.cashier = user
    sale.save(
        update_fields=[
            "subtotal",
            "total_amount",
            "status",
            "completed_at",
            "cashier",
        ]
    )

    return sale
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.customers.models import Debt, DebtPayment


@transaction.atomic
def pay_debt(debt_id, amount, user, comment=""):
    debt = (
        Debt.objects.select_for_update()
        .select_related("customer", "customer__company")
        .get(pk=debt_id)
    )

    if debt.customer.company.owner_id != user.id:
        raise ValidationError("Access denied.")

    amount = Decimal(str(amount))

    if amount <= 0:
        raise ValidationError({"amount": "Amount must be positive."})

    if amount > debt.remaining_amount:
        raise ValidationError(
            {"amount": "Payment exceeds remaining debt."}
        )

    DebtPayment.objects.create(
        debt=debt,
        amount=amount,
        received_by=user,
        comment=comment,
    )

    debt.remaining_amount -= amount

    if debt.remaining_amount == 0:
        debt.status = Debt.Status.PAID
    else:
        debt.status = Debt.Status.PARTIALLY_PAID

    debt.save(update_fields=["remaining_amount", "status"])

    customer = debt.customer
    customer.balance = max(
        Decimal("0.00"),
        customer.balance - amount,
    )
    customer.save(update_fields=["balance", "updated_at"])

    return debt
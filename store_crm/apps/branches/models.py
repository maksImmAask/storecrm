from django.conf import settings
from django.db import models

from apps.companies.models import Company


class Branch(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="branches",
    )

    name = models.CharField(max_length=255)

    address = models.TextField()

    phone = models.CharField(max_length=20)

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "branches"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.company.name} — {self.name}"


class UserBranchRole(models.Model):
    class Role(models.TextChoices):
        OWNER = "owner", "Owner"
        ADMINISTRATOR = "administrator", "Administrator"
        MANAGER = "manager", "Manager"
        CASHIER = "cashier", "Cashier"
        WAREHOUSE_MANAGER = "warehouse_manager", "Warehouse Manager"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="branch_roles",
    )

    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="user_roles",
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
    )

    class Meta:
        db_table = "user_branch_roles"

        constraints = [
            models.UniqueConstraint(
                fields=["user", "branch"],
                name="unique_user_branch_role",
            ),
        ]

        ordering = ["user_id", "branch_id"]

    def __str__(self):
        return (
            f"{self.user.get_full_name()} — "
            f"{self.branch.name} — "
            f"{self.get_role_display()}"
        )
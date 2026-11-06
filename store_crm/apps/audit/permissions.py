from rest_framework.permissions import BasePermission

from apps.companies.models import Company


class IsCompanyOwnerOrSuperuser(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        if not user or not user.is_authenticated:
            return False

        if user.is_superuser:
            return True

        return Company.objects.filter(
            owner=user
        ).exists()
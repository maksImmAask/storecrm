from rest_framework import viewsets

from apps.audit.models import AuditLog
from apps.audit.permissions import IsCompanyOwnerOrSuperuser
from apps.audit.serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    permission_classes = [IsCompanyOwnerOrSuperuser]

    def get_queryset(self):
        queryset = AuditLog.objects.select_related(
            "user",
            "company",
        )

        if self.request.user.is_superuser:
            return queryset

        return queryset.filter(
            company__owner=self.request.user
        )
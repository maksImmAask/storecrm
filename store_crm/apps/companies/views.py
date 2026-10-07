from rest_framework import permissions, viewsets

from .models import Company
from .serializers import CompanySerializer


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Company.objects.filter(
            owner=self.request.user
        ).select_related("owner")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
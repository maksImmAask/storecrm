from rest_framework import permissions, viewsets

from .models import Branch, UserBranchRole
from .serializers import (
    BranchSerializer,
    UserBranchRoleSerializer,
)


class BranchViewSet(viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Branch.objects.filter(
            company__owner=self.request.user
        ).select_related("company")


class UserBranchRoleViewSet(viewsets.ModelViewSet):
    serializer_class = UserBranchRoleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserBranchRole.objects.filter(
            branch__company__owner=self.request.user
        ).select_related(
            "user",
            "branch",
            "branch__company",
        )
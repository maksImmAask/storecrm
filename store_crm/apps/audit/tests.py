
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status

from apps.users.models import User
from apps.audit.models import AuditLog
from apps.audit.views import AuditLogViewSet


class AuditLogAPITests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="audit-user@example.com",
            first_name="Audit",
            last_name="User",
            phone="+998901234501",
            password="test-password",
        )
        cls.admin = User.objects.create_superuser(
            email="audit-admin@example.com",
            first_name="Audit",
            last_name="Admin",
            phone="+998901234502",
            password="test-password",
        )
        cls.log = AuditLog.objects.create(
            user=cls.user,
            action="created",
            model_name="Product",
            object_id="123",
            old_data={},
            new_data={"name": "Test product"},
            ip_address="127.0.0.1",
        )

    def test_admin_can_list_audit_logs(self):
        request = APIRequestFactory().get("/api/audit-logs/")
        force_authenticate(request, user=self.admin)
        response = AuditLogViewSet.as_view({"get": "list"})(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_list_audit_logs(self):
        request = APIRequestFactory().get("/api/audit-logs/")
        force_authenticate(request, user=self.user)
        response = AuditLogViewSet.as_view({"get": "list"})(request)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_admin_can_retrieve_audit_log(self):
        request = APIRequestFactory().get(
            f"/api/audit-logs/{self.log.pk}/"
        )
        force_authenticate(request, user=self.admin)
        response = AuditLogViewSet.as_view(
            {"get": "retrieve"}
        )(request, pk=self.log.pk)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["action"], "created")
        self.assertEqual(response.data["model_name"], "Product")

    
    def test_audit_log_is_read_only(self):
        request = APIRequestFactory().patch(
            f"/api/audit-logs/{self.log.pk}/",
            {"action": "modified"},
            format="json",
        )
        force_authenticate(request, user=self.admin)

        response = AuditLogViewSet.as_view(
            {"patch": "partial_update"}
        )(request, pk=self.log.pk) if hasattr(
            AuditLogViewSet, "partial_update"
        ) else None

        if response is None:
            self.assertFalse(
                hasattr(AuditLogViewSet, "partial_update")
            )
        else:
            self.assertEqual(
                response.status_code,
                status.HTTP_405_METHOD_NOT_ALLOWED,
            )

        self.log.refresh_from_db()
        self.assertEqual(self.log.action, "created")

    def test_audit_log_serializer_includes_user_email(self):
        from apps.audit.serializers import AuditLogSerializer

        data = AuditLogSerializer(self.log).data

        self.assertEqual(
            data["user_email"],
            "audit-user@example.com",
        )
        self.assertEqual(data["object_id"], "123")

    def test_audit_log_can_exist_without_user(self):
        log = AuditLog.objects.create(
            user=None,
            action="system_event",
            model_name="System",
            object_id="",
        )

        self.assertIsNone(log.user)
        self.assertEqual(log.action, "system_event")

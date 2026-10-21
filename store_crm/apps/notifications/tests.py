
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.users.models import User
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from apps.notifications.views import NotificationViewSet


class NotificationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="notifications-user@example.com",
            first_name="Notification",
            last_name="User",
            phone="+998901234511",
            password="test-password",
        )
        cls.other_user = User.objects.create_user(
            email="notifications-other@example.com",
            first_name="Other",
            last_name="User",
            phone="+998901234512",
            password="test-password",
        )

        cls.notification = Notification.objects.create(
            user=cls.user,
            title="Test notification",
            message="This is a test message.",
        )
        cls.other_notification = Notification.objects.create(
            user=cls.other_user,
            title="Private notification",
            message="This belongs to another user.",
        )

    def get_view(self, user, method, action, data=None, pk=None):
        factory = APIRequestFactory()
        path = f"/api/notifications/{pk}/" if pk else "/api/notifications/"

        if method == "get":
            request = factory.get(path, data or {})
        else:
            request = factory.post(path, data or {}, format="json")

        force_authenticate(request, user=user)
        view = NotificationViewSet.as_view({method: action})

        if pk is not None:
            return view(request, pk=pk)
        return view(request)

    def test_service_creates_notification_for_user(self):
        notification = create_notification(
            self.user,
            "New order",
            "An order has been created.",
        )

        self.assertEqual(notification.user, self.user)
        self.assertEqual(notification.title, "New order")
        self.assertFalse(notification.is_read)

    def test_user_sees_only_own_notifications(self):
        response = self.get_view(self.user, "get", "list")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        returned_ids = [item["id"] for item in response.data["results"]] \
            if isinstance(response.data, dict) and "results" in response.data \
            else [item["id"] for item in response.data]

        self.assertIn(self.notification.id, returned_ids)
        self.assertNotIn(self.other_notification.id, returned_ids)

    def test_user_can_mark_own_notification_read(self):
        response = self.get_view(
            self.user,
            "post",
            "mark_read",
            pk=self.notification.pk,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.notification.refresh_from_db()
        self.assertTrue(self.notification.is_read)

    def test_user_cannot_mark_another_users_notification_read(self):
        response = self.get_view(
            self.user,
            "post",
            "mark_read",
            pk=self.other_notification.pk,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        self.other_notification.refresh_from_db()
        self.assertFalse(self.other_notification.is_read)

    def test_mark_all_read_only_updates_current_users_notifications(self):
        own_unread = Notification.objects.create(
            user=self.user,
            title="Unread",
            message="Please read this.",
        )
        other_unread = Notification.objects.create(
            user=self.other_user,
            title="Other unread",
            message="Not yours.",
        )

        response = self.get_view(
            self.user,
            "post",
            "mark_all_read",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        own_unread.refresh_from_db()
        other_unread.refresh_from_db()

        self.assertTrue(own_unread.is_read)
        self.assertFalse(other_unread.is_read)

    def test_notification_text_is_read_only(self):
        response = self.get_view(
            self.user,
            "post",
            "mark_read",
            data={"title": "Changed title", "message": "Changed message"},
            pk=self.notification.pk,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.notification.refresh_from_db()
        self.assertEqual(self.notification.title, "Test notification")
        self.assertEqual(
            self.notification.message,
            "This is a test message.",
        )

    def test_user_cannot_retrieve_another_users_notification(self):
        response = self.get_view(
            self.user,
            "get",
            "retrieve",
            pk=self.other_notification.pk,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

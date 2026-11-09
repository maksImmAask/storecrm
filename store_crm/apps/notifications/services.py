from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.utils import timezone

from apps.notifications.models import Notification


def send_notification_to_user(notification):
    channel_layer = get_channel_layer()

    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        f"user_{notification.user_id}",
        {
            "type": "notification_message",
            "id": notification.id,
            "title": notification.title,
            "message": notification.message,
            "created_at": notification.created_at.isoformat(),
        },
    )


def create_notification(user, title, message):
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
    )

    transaction.on_commit(
        lambda: send_notification_to_user(notification)
    )

    return notification
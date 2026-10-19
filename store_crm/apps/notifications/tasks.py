from celery import shared_task
from django.utils import timezone

from apps.notifications.models import Notification


@shared_task
def cleanup_old_notifications(days=180):
    cutoff = timezone.now() - timezone.timedelta(days=days)

    deleted, _ = Notification.objects.filter(
        is_read=True,
        created_at__lt=cutoff,
    ).delete()

    return deleted


@shared_task
def send_daily_summary():
    # Здесь можно формировать и отправлять сводку по продажам.
    # Отправку email подключим после настройки SMTP.
    return {
        "status": "ready",
        "generated_at": timezone.now().isoformat(),
    }
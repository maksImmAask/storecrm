from apps.audit.models import AuditLog


def log_action(
    *,
    user=None,
    action,
    instance,
    old_data=None,
    new_data=None,
    ip_address=None,
):
    return AuditLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        action=action,
        model_name=instance._meta.label,
        object_id=str(instance.pk),
        old_data=old_data or {},
        new_data=new_data or {},
        ip_address=ip_address,
    )
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from accounts.models import User


ELIGIBILITY_FIELDS = {"department", "experience_years", "location", "active_tasks_count"}


@receiver(pre_save, sender=User)
def track_user_changes(sender, instance, **kwargs):
    """Track which eligibility-relevant fields changed on the user."""

    if not instance.pk:
        return

    try:
        old = User.objects.get(pk=instance.pk)
    except User.DoesNotExist:
        return

    changed = set()
    for field in ELIGIBILITY_FIELDS:
        if getattr(old, field) != getattr(instance, field):
            changed.add(field)

    instance._changed_fields = changed


@receiver(post_save, sender=User)
def recompute_on_user_change(sender, instance, created, **kwargs):
    """When a user's eligibility attributes change, recompute their assignments."""

    if created:
        return

    changed = getattr(instance, "_changed_fields", set())

    if not changed:
        return

    from eligibility.tasks import recompute_user_eligibility

    recompute_user_eligibility.delay(instance.id)

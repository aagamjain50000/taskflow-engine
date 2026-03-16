from django.db.models.signals import post_save
from django.dispatch import receiver

from tasks.models import Task
from rules.models import TaskRule
from eligibility.tasks import compute_task_assignment, recompute_task_eligibility


@receiver(post_save, sender=Task)
def auto_assign_task(sender, instance, created, **kwargs):
    """When a new task is created, compute assignment in background.
    """

    if created:
        compute_task_assignment.apply_async(
            args=[instance.id],
            countdown=2,
        )


@receiver(post_save, sender=TaskRule)
def recompute_on_rule_change(sender, instance, created, **kwargs):
    """When task rules change, recompute eligible users."""

    if not created:
        recompute_task_eligibility.delay(instance.task_id)
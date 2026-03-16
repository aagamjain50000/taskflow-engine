from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from assignments.models import TaskAssignment
from eligibility.services.cache import (
    invalidate_my_eligible_tasks,
    invalidate_task_eligible_users,
)


@receiver(post_save, sender=TaskAssignment)
def invalidate_cache_on_assignment_save(sender, instance, **kwargs):
    invalidate_my_eligible_tasks(instance.user_id)
    invalidate_task_eligible_users(instance.task_id)


@receiver(post_delete, sender=TaskAssignment)
def invalidate_cache_on_assignment_delete(sender, instance, **kwargs):
    invalidate_my_eligible_tasks(instance.user_id)
    invalidate_task_eligible_users(instance.task_id)

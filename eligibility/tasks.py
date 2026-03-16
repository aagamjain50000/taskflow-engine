import logging

from celery import shared_task
from django.core.cache import cache

from tasks.models import Task
from accounts.models import User
from assignments.models import TaskAssignment
from eligibility.services.rule_engine import RuleEngine
from eligibility.services.cache import (
    invalidate_my_eligible_tasks,
    invalidate_many_users_my_eligible_tasks,
    invalidate_task_eligible_users,
)

logger = logging.getLogger(__name__)


@shared_task
def compute_task_assignment(task_id):
    """Compute and assign a newly created task to the best eligible user."""

    try:
        task = Task.objects.select_related("rule").get(id=task_id)
    except Task.DoesNotExist:
        logger.error("Task %s not found for assignment", task_id)
        return

    result = RuleEngine.assign_task(task)

    if result:
        invalidate_my_eligible_tasks(result.user_id)
        logger.info("Task %s assigned to user %s", task_id, result.user_id)
    else:
        logger.warning("Task %s could not be assigned — no eligible users", task_id)


@shared_task
def recompute_task_eligibility(task_id):
    """Recompute assignment when a task's rules change."""

    try:
        task = Task.objects.select_related("rule").get(id=task_id)
    except Task.DoesNotExist:
        logger.error("Task %s not found for recomputation", task_id)
        return

    old_user_ids = list(
        TaskAssignment.objects.filter(task_id=task_id).values_list("user_id", flat=True)
    )
    new_assignment = RuleEngine.recompute_for_task(task)

    invalidate_task_eligible_users(task_id)
    impacted_user_ids = set(old_user_ids)
    if new_assignment:
        impacted_user_ids.add(new_assignment.user_id)
    invalidate_many_users_my_eligible_tasks(impacted_user_ids)

    logger.info("Recomputed eligibility for task %s", task_id)


@shared_task
def recompute_user_eligibility(user_id):
    """Recompute assignments when a user's attributes change."""

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        logger.error("User %s not found for recomputation", user_id)
        return

    RuleEngine.recompute_for_user(user)

    invalidate_my_eligible_tasks(user_id)

    logger.info("Recomputed eligibility for user %s", user_id)


@shared_task
def process_recompute_chunk(task_ids):
    """Process a chunk of tasks for eligibility recomputation."""
    tasks = Task.objects.filter(id__in=task_ids).select_related("rule")
    count = 0
    for task in tasks:
        RuleEngine.recompute_for_task(task)
        count += 1
    return count


@shared_task
def bulk_recompute_all_tasks():
    """Recompute eligibility for all active tasks. Used for admin bulk operations. (Chunked)"""

    task_ids = list(Task.objects.filter(
        status__in=["TODO", "IN_PROGRESS"]
    ).values_list("id", flat=True))

    chunk_size = 1000
    chunks = [task_ids[i:i + chunk_size] for i in range(0, len(task_ids), chunk_size)]

    for chunk in chunks:
        process_recompute_chunk.delay(chunk)

    cache.delete_pattern("eligible_users:task:*")
    cache.delete_pattern("my_eligible_tasks:user:*")

    logger.info("Queued bulk recompute for %d tasks in %d chunks", len(task_ids), len(chunks))
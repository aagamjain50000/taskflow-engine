import logging

from django.db.models import F

from accounts.models import User
from rules.models import TaskRule
from assignments.models import TaskAssignment

logger = logging.getLogger(__name__)


class RuleEngine:

    @staticmethod
    def get_eligible_users(task):
        """Return queryset of users matching the task's assignment rules."""

        try:
            rule = task.rule
        except TaskRule.DoesNotExist:
            return User.objects.none()

        users = User.objects.only(
            "id",
            "username",
            "department",
            "experience_years",
            "location",
            "active_tasks_count",
        ).filter(
            experience_years__gte=rule.min_experience,
            active_tasks_count__lt=rule.max_active_tasks,
        )

        # Department: support multi-department allow-list with fallback to single value.
        if getattr(rule, "departments", None):
            users = users.filter(department__in=rule.departments)
        else:
            users = users.filter(department=rule.department)

        # Experience upper bound
        if getattr(rule, "max_experience", None) is not None:
            users = users.filter(experience_years__lte=rule.max_experience)

        if getattr(rule, "locations_allow", None):
            users = users.filter(location__in=rule.locations_allow)
        elif rule.location:
            users = users.filter(location=rule.location)

        if getattr(rule, "locations_deny", None):
            users = users.exclude(location__in=rule.locations_deny)

        return users

    @staticmethod
    def select_best_user(users):
        """Pick the user with the fewest active tasks."""

        return users.order_by("active_tasks_count", "id").first()

    @staticmethod
    def assign_task(task):
        """
        Assign a task to the best eligible user.

        - If multiple eligible users: picks the one with fewest active tasks.
        - If no eligible users: logs a warning and marks task as unassigned.
        """

        users = RuleEngine.get_eligible_users(task)

        if not users.exists():
            logger.warning(
                "No eligible users found for task %s (id=%d). "
                "Task remains unassigned.",
                task.title,
                task.id,
            )
            return None

        user = RuleEngine.select_best_user(users)

        assignment, created = TaskAssignment.objects.get_or_create(
            task=task,
            user=user,
        )

        if created:
            User.objects.filter(id=user.id).update(
                active_tasks_count=F("active_tasks_count") + 1
            )

        return assignment

    @staticmethod
    def recompute_for_task(task):
        """
        Recompute assignment for a task whose rules have changed.
        Removes old assignments and reassigns.
        """

        old_assignments = TaskAssignment.objects.filter(task=task)
        old_user_ids = list(old_assignments.values_list("user_id", flat=True))

        old_assignments.delete()

        if old_user_ids:
            User.objects.filter(
                id__in=old_user_ids,
                active_tasks_count__gt=0,
            ).update(
                active_tasks_count=F("active_tasks_count") - 1
            )

        return RuleEngine.assign_task(task)

    @staticmethod
    def recompute_for_user(user):
        """
        Recompute assignments for a user whose attributes changed.
        Check all their current assignments and remove ineligible ones,
        then check unassigned tasks they might now be eligible for.
        """

        from tasks.models import Task

        current_assignments = TaskAssignment.objects.filter(
            user=user
        ).select_related("task", "task__rule")

        for assignment in current_assignments:
            task = assignment.task
            try:
                rule = task.rule
            except TaskRule.DoesNotExist:
                continue

            eligible_department = (
                (getattr(rule, "departments", None) and user.department in rule.departments)
                or (not getattr(rule, "departments", None) and user.department == rule.department)
            )
            eligible_experience = user.experience_years >= rule.min_experience and (
                getattr(rule, "max_experience", None) is None
                or user.experience_years <= rule.max_experience
            )
            eligible_location = True
            if getattr(rule, "locations_allow", None):
                eligible_location = user.location in rule.locations_allow
            elif rule.location:
                eligible_location = user.location == rule.location
            if getattr(rule, "locations_deny", None) and user.location in rule.locations_deny:
                eligible_location = False

            eligible = eligible_department and eligible_experience and eligible_location

            if not eligible:
                assignment.delete()
                User.objects.filter(
                    id=user.id,
                    active_tasks_count__gt=0,
                ).update(
                    active_tasks_count=F("active_tasks_count") - 1
                )
                RuleEngine.assign_task(task)

        unassigned_tasks = Task.objects.filter(
            status__in=["TODO", "IN_PROGRESS"],
        ).exclude(
            assignments__isnull=False,
        ).select_related("rule")

        for task in unassigned_tasks:
            try:
                rule = task.rule
            except TaskRule.DoesNotExist:
                continue

            user.refresh_from_db()

            eligible_department = (
                (getattr(rule, "departments", None) and user.department in rule.departments)
                or (not getattr(rule, "departments", None) and user.department == rule.department)
            )
            eligible_experience = user.experience_years >= rule.min_experience and (
                getattr(rule, "max_experience", None) is None
                or user.experience_years <= rule.max_experience
            )
            eligible_location = True
            if getattr(rule, "locations_allow", None):
                eligible_location = user.location in rule.locations_allow
            elif rule.location:
                eligible_location = user.location == rule.location
            if getattr(rule, "locations_deny", None) and user.location in rule.locations_deny:
                eligible_location = False

            eligible = (
                eligible_department
                and eligible_experience
                and eligible_location
                and user.active_tasks_count < rule.max_active_tasks
            )

            if eligible:
                RuleEngine.assign_task(task)
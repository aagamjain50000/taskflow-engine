import random
from datetime import timedelta

from django.utils import timezone
from django.core.management.base import BaseCommand

from tasks.models import Task
from rules.models import TaskRule
from accounts.models import User
from eligibility.tasks import bulk_recompute_all_tasks

BATCH_SIZE = 5000


class Command(BaseCommand):
    help = "Seed tasks with rules (default: 1M tasks)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=1000000,
            help="Number of tasks to create (default: 1000000)",
        )

    def handle(self, *args, **kwargs):

        count = kwargs["count"]

        admin_users = list(
            User.objects.filter(role="ADMIN").values_list("id", flat=True)[:100]
        )

        if not admin_users:
            admin_users = list(
                User.objects.values_list("id", flat=True)[:100]
            )

        if not admin_users:
            self.stderr.write("No users found. Run 'python manage.py seed_data' first.")
            return

        departments = ["Finance", "HR", "IT", "Operations"]
        locations = ["Delhi", "Mumbai", "Bangalore", "Remote"]

        tasks_batch = []
        rules_batch = []

        for i in range(count):

            due_date = (timezone.now() + timedelta(days=random.randint(1, 90))).date()

            task = Task(
                title=f"Task {i}",
                description=f"Auto-generated task #{i} for testing",
                priority=random.randint(1, 3),
                due_date=due_date,
                created_by_id=random.choice(admin_users),
            )

            tasks_batch.append(task)

            if len(tasks_batch) >= BATCH_SIZE:
                Task.objects.bulk_create(tasks_batch)
                self.stdout.write(f"Created {i + 1} tasks...")
                tasks_batch = []

        if tasks_batch:
            Task.objects.bulk_create(tasks_batch)

        # Now create rules for all tasks that don't have one
        tasks_without_rules = Task.objects.filter(
            rule__isnull=True
        ).values_list("id", flat=True)

        for task_id in tasks_without_rules:

            rule = TaskRule(
                task_id=task_id,
                department=random.choice(departments),
                min_experience=random.randint(1, 8),
                location=random.choice(locations) if random.random() > 0.3 else None,
                max_active_tasks=random.randint(3, 10),
            )

            rules_batch.append(rule)

            if len(rules_batch) >= BATCH_SIZE:
                TaskRule.objects.bulk_create(rules_batch, ignore_conflicts=True)
                rules_batch = []

        if rules_batch:
            TaskRule.objects.bulk_create(rules_batch, ignore_conflicts=True)

        self.stdout.write("Queueing tasks for assignment via Celery...")
        bulk_recompute_all_tasks.delay()

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {count} tasks with rules. "
                f"Assignment has been queued for background processing."
            )
        )
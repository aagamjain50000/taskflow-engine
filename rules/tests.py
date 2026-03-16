from django.test import TestCase
from django.contrib.auth import get_user_model
from tasks.models import Task
from rules.models import TaskRule

User = get_user_model()


class RulesModelTests(TestCase):

    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="pw", role="ADMIN")
        self.task = Task.objects.create(
            title="Rule Test Task",
            due_date="2026-12-31",
            created_by=self.admin
        )

    def test_create_task_rule(self):
        rule = TaskRule.objects.create(
            task=self.task,
            department="Operations",
            min_experience=3,
            max_active_tasks=5,
            location="Mumbai"
        )
        self.assertEqual(rule.department, "Operations")
        self.assertEqual(rule.min_experience, 3)
        self.assertEqual(rule.max_active_tasks, 5)
        self.assertEqual(str(rule), f"Rules for Task {self.task.id}")

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from tasks.models import Task
from rules.models import TaskRule
from assignments.models import TaskAssignment
from eligibility.services.rule_engine import RuleEngine

User = get_user_model()


class EligibilityAPITests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="pw", role="ADMIN")
        
        # User 1: IT, 3 years exp, 1 active task
        self.user1 = User.objects.create_user(
            username="user1", password="pw", role="USER",
            department="IT", experience_years=3, location="Remote"
        )
        
        # User 2: IT, 5 years exp, 0 active tasks
        self.user2 = User.objects.create_user(
            username="user2", password="pw", role="USER",
            department="IT", experience_years=5, location="Remote"
        )

        # User 3: Finance, 5 years exp, 0 active tasks
        self.user3 = User.objects.create_user(
            username="user3", password="pw", role="USER",
            department="Finance", experience_years=5, location="Remote"
        )

        self.task = Task.objects.create(
            description="Needs IT person",
            priority=2,
            due_date="2026-12-31",
            created_by=self.admin
        )
        self.rule = TaskRule.objects.create(
            task=self.task, department="IT", min_experience=2, max_active_tasks=5
        )

        # Assign to user1 to increase active tasks count
        TaskAssignment.objects.create(task=Task.objects.create(title="Dummy", due_date="2026-12-31", created_by=self.admin), user=self.user1)
        self.user1.active_tasks_count = 1
        self.user1.save()

    def test_rule_engine_get_eligible_users(self):
        eligible = RuleEngine.get_eligible_users(self.task)
        # Should include user1 and user2, but not user3 (wrong dept) or admin (wrong role)
        names = [u.username for u in eligible]
        self.assertIn("user1", names)
        self.assertIn("user2", names)
        self.assertNotIn("user3", names)
        self.assertNotIn("admin", names)

    def test_rule_engine_get_eligible_users_v2_fields(self):
        # Expand the rule to cover multi-department and location allow/deny and max experience.
        self.rule.departments = ["IT", "Finance"]
        self.rule.locations_allow = ["Remote"]
        self.rule.locations_deny = ["Mumbai"]
        self.rule.max_experience = 5
        self.rule.save()

        # user1 (IT, 3y, Remote) eligible; user2 (IT, 5y, Remote) eligible; user3 (Finance, 5y, Remote) eligible
        eligible = RuleEngine.get_eligible_users(self.task)
        names = [u.username for u in eligible]
        self.assertIn("user1", names)
        self.assertIn("user2", names)
        self.assertIn("user3", names)

        # If we deny Remote, everyone should be excluded.
        self.rule.locations_deny = ["Remote"]
        self.rule.save()
        eligible2 = RuleEngine.get_eligible_users(self.task)
        self.assertEqual(list(eligible2), [])

    def test_rule_engine_select_best_user(self):
        eligible = RuleEngine.get_eligible_users(self.task)
        # user2 has 0 tasks, user1 has 1 task
        best = RuleEngine.select_best_user(eligible)
        self.assertEqual(best.username, "user2")

    def test_assign_task(self):
        result = RuleEngine.assign_task(self.task)
        self.assertIsNotNone(result)
        self.assertEqual(result.user.username, "user2")
        
        # Check if count incremented
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.active_tasks_count, 1)

    def test_eligible_users_api(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("eligible-users", kwargs={"task_id": self.task.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Two users should be eligible
        self.assertEqual(response.data["count"], 2)

    def test_recompute_eligibility_api_admin(self):
        self.client.force_authenticate(user=self.admin)
        url = reverse("recompute-eligibility")
        response = self.client.post(url, {"task_id": self.task.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("job queued", response.data["message"])

    def test_recompute_eligibility_api_user_forbidden(self):
        self.client.force_authenticate(user=self.user1)
        url = reverse("recompute-eligibility")
        response = self.client.post(url, {"task_id": self.task.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

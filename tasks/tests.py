from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from tasks.models import Task
from rules.models import TaskRule
from assignments.models import TaskAssignment
from django.core.cache import cache
from eligibility.services.cache import my_eligible_tasks_cache_key

User = get_user_model()


class TasksAPITests(APITestCase):

    def setUp(self):
        self.admin = User.objects.create_user(username="admin", password="password123", role="ADMIN")
        self.manager = User.objects.create_user(username="manager", password="password123", role="MANAGER")
        self.user = User.objects.create_user(username="user", password="password123", role="USER")

        self.task = Task.objects.create(
            title="Initial Task",
            description="Test Description",
            priority=2,
            due_date="2026-12-31",
            created_by=self.admin
        )
        self.rule = TaskRule.objects.create(
            task=self.task,
            department="IT",
            min_experience=2,
            max_active_tasks=5
        )
        TaskAssignment.objects.create(task=self.task, user=self.user)

        self.list_create_url = reverse("task-list-create")
        self.detail_url = reverse("task-detail", kwargs={"pk": self.task.id})
        self.status_url = reverse("task-status", kwargs={"pk": self.task.id})

    def test_list_tasks_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.list_create_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Check pagination structure
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 1)

    def test_create_task_admin(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "title": "New Task",
            "description": "Desc",
            "priority": 3,
            "due_date": "2026-12-31",
            "rule": {
                "department": "Finance",
                "min_experience": 5,
                "max_active_tasks": 5
            }
        }
        response = self.client.post(self.list_create_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Task.objects.count(), 2)
        self.assertEqual(TaskRule.objects.count(), 2)

    def test_create_task_manager(self):
        self.client.force_authenticate(user=self.manager)
        data = {
            "title": "Manager Task",
            "description": "Desc",
            "priority": 1,
            "due_date": "2026-12-31",
            "rule": {
                "department": "HR",
                "min_experience": 1,
                "max_active_tasks": 5
            }
        }
        response = self.client.post(self.list_create_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_task_user_forbidden(self):
        self.client.force_authenticate(user=self.user)
        data = {"title": "User Task", "description": "Desc", "priority": 1, "due_date": "2026-12-31"}
        response = self.client.post(self.list_create_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_update_task_admin(self):
        self.client.force_authenticate(user=self.admin)
        data = {
            "title": "Updated Title",
            "description": "Updated Description",
            "priority": 1,
            "due_date": "2026-12-31",
            "rule": {
                "department": "IT",
                "min_experience": 3,
                "max_active_tasks": 5
            }
        }
        response = self.client.put(self.detail_url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.task.refresh_from_db()
        self.assertEqual(self.task.title, "Updated Title")
        self.assertEqual(self.task.rule.min_experience, 3)

    def test_delete_task_admin(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Task.objects.count(), 0)

    def test_delete_task_manager_not_owner_forbidden(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.delete(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_transition_valid(self):
        self.client.force_authenticate(user=self.user)
        # Transition from TODO to IN_PROGRESS
        response = self.client.patch(self.status_url, {"status": "IN_PROGRESS"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "IN_PROGRESS")

    def test_status_transition_invalidates_my_eligible_tasks_cache(self):
        self.client.force_authenticate(user=self.user)
        my_tasks_url = reverse("my-eligible-tasks")
        _ = self.client.get(my_tasks_url)
        cache_key = my_eligible_tasks_cache_key(self.user.id, 1)
        self.assertIsNotNone(cache.get(cache_key))

        _ = self.client.patch(self.status_url, {"status": "IN_PROGRESS"}, format="json")
        self.assertIsNone(cache.get(cache_key))

    def test_status_transition_invalid(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(self.status_url, {"status": "DONE"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

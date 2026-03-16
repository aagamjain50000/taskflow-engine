from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core.cache import cache
from tasks.models import Task
from assignments.models import TaskAssignment
from eligibility.services.cache import my_eligible_tasks_cache_key

User = get_user_model()


class AssignmentsAPITests(APITestCase):

    def setUp(self):
        self.user = User.objects.create_user(
            username="user1", password="pw", role="USER",
            department="IT", experience_years=3, location="Remote"
        )
        self.admin = User.objects.create_user(
            username="admin", password="pw", role="ADMIN"
        )
        self.task1 = Task.objects.create(title="Task 1", due_date="2026-12-31", created_by=self.admin)
        self.task2 = Task.objects.create(title="Task 2", due_date="2026-12-31", created_by=self.admin)
        
        TaskAssignment.objects.create(task=self.task1, user=self.user)
        TaskAssignment.objects.create(task=self.task2, user=self.user)

        self.url = reverse("my-eligible-tasks")

    def test_my_eligible_tasks_list(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data)
        self.assertEqual(len(response.data["results"]), 2)
        titles = [t["title"] for t in response.data["results"]]
        self.assertIn("Task 1", titles)
        self.assertIn("Task 2", titles)

    def test_my_eligible_tasks_cached(self):
        self.client.force_authenticate(user=self.user)
        response1 = self.client.get(self.url)
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        cache_key = my_eligible_tasks_cache_key(self.user.id, 1)
        cached_data = cache.get(cache_key)
        self.assertIsNotNone(cached_data)

        response2 = self.client.get(self.url)
        self.assertEqual(response2.data, cached_data)

    def test_assignment_signal_invalidates_my_eligible_tasks_cache(self):
        self.client.force_authenticate(user=self.user)

        _ = self.client.get(self.url)
        cache_key = my_eligible_tasks_cache_key(self.user.id, 1)
        self.assertIsNotNone(cache.get(cache_key))

        TaskAssignment.objects.filter(task=self.task1, user=self.user).delete()
        self.assertIsNone(cache.get(cache_key))

    def test_my_eligible_tasks_unauthenticated(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

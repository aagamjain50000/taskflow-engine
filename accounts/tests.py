from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class AccountsAPITests(APITestCase):

    def setUp(self):
        self.user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123",
            "role": "USER",
            "department": "IT",
            "experience_years": 2,
            "location": "Remote"
        }
        self.admin_data = {
            "username": "adminuser",
            "password": "adminpassword123",
            "role": "ADMIN",
        }
        # Pre-create an admin user
        self.admin_user = User.objects.create_user(**self.admin_data)

    def test_user_signup_success(self):
        url = reverse("signup")
        response = self.client.post(url, self.user_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["username"], self.user_data["username"])
        self.assertTrue(User.objects.filter(username="testuser").exists())

    def test_prevent_admin_signup(self):
        url = reverse("signup")
        data = self.user_data.copy()
        data["role"] = "ADMIN"
        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("role", response.data)

    def test_user_login(self):
        # First sign up
        User.objects.create_user(**self.user_data)
        url = reverse("token_obtain_pair")
        login_data = {
            "username": self.user_data["username"],
            "password": self.user_data["password"]
        }
        response = self.client.post(url, login_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_get_profile(self):
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)
        url = reverse("profile")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "testuser")
        self.assertEqual(response.data["department"], "IT")

    def test_update_profile(self):
        user = User.objects.create_user(**self.user_data)
        self.client.force_authenticate(user=user)
        url = reverse("profile")
        update_data = {
            "department": "Finance",
            "experience_years": 5,
            "location": "Mumbai",
            "email": "new@example.com"
        }
        response = self.client.put(url, update_data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        user.refresh_from_db()
        self.assertEqual(user.department, "Finance")
        self.assertEqual(user.experience_years, 5)

    def test_profile_requires_auth(self):
        url = reverse("profile")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

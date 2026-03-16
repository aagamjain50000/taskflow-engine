from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):

    ROLE_CHOICES = (
        ("ADMIN", "Admin"),
        ("MANAGER", "Manager"),
        ("USER", "User"),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    department = models.CharField(max_length=50)

    experience_years = models.PositiveIntegerField(default=0)

    location = models.CharField(max_length=100)

    active_tasks_count = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=["department"]),
            models.Index(fields=["experience_years"]),
            models.Index(fields=["location"]),
            models.Index(fields=["active_tasks_count"]),
            models.Index(
                fields=["department", "experience_years", "active_tasks_count"],
                name="idx_user_eligibility",
            ),
        ]
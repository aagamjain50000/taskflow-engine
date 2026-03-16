from django.db import models
from django.contrib.postgres.fields import ArrayField
from tasks.models import Task


class TaskRule(models.Model):

    task = models.OneToOneField(
        Task,
        on_delete=models.CASCADE,
        related_name="rule"
    )

    department = models.CharField(max_length=50)

    min_experience = models.IntegerField()
    max_experience = models.IntegerField(null=True, blank=True)

    location = models.CharField(max_length=100, null=True, blank=True)

    max_active_tasks = models.IntegerField()

    departments = ArrayField(
        models.CharField(max_length=50),
        null=True,
        blank=True,
        help_text="Optional allow-list. If set, user.department must be in this list.",
    )
    locations_allow = ArrayField(
        models.CharField(max_length=100),
        null=True,
        blank=True,
        help_text="Optional allow-list. If set, user.location must be in this list.",
    )
    locations_deny = ArrayField(
        models.CharField(max_length=100),
        null=True,
        blank=True,
        help_text="Optional deny-list. If set, user.location must NOT be in this list.",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["department"]),
            models.Index(fields=["min_experience"]),
        ]

    def __str__(self):
        return f"Rules for Task {self.task_id}"
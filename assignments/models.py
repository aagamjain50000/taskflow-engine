from django.db import models
from django.conf import settings
from tasks.models import Task


class TaskAssignment(models.Model):

    STATUS_CHOICES = (
        ("ASSIGNED", "Assigned"),
        ("IN_PROGRESS", "In Progress"),
        ("DONE", "Done"),
    )

    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name="assignments"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="task_assignments"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="ASSIGNED"
    )

    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["task"]),
            models.Index(
                fields=["user", "status"],
                name="idx_assignment_user_status",
            ),
        ]
        unique_together = ("task", "user")

    def __str__(self):
        return f"{self.task_id} -> {self.user_id}"
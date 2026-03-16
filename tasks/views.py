from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from tasks.models import Task
from tasks.serializers import TaskSerializer, TaskStatusSerializer
from accounts.permissions import IsAdmin, IsManagerOrAdmin, IsOwnerOrAdmin
from assignments.models import TaskAssignment
from accounts.models import User
from django.db import models
from django.db.models import F
from django.core.cache import cache
from eligibility.services.cache import (
    invalidate_many_users_my_eligible_tasks,
    invalidate_task_eligible_users,
)


class TaskListCreateView(generics.ListCreateAPIView):

    serializer_class = TaskSerializer

    def get_permissions(self):

        if self.request.method == "POST":
            return [IsManagerOrAdmin()]

        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Task.objects.select_related("rule").order_by("-created_at")

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        priority_filter = self.request.query_params.get("priority")
        if priority_filter:
            qs = qs.filter(priority=priority_filter)

        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = TaskSerializer

    permission_classes = [IsAuthenticated, IsOwnerOrAdmin]

    def get_queryset(self):
        return Task.objects.select_related("rule")

    def perform_destroy(self, instance):

        assigned_user_ids = list(
            TaskAssignment.objects.filter(task=instance)
            .values_list("user_id", flat=True)
        )
        if assigned_user_ids:
            User.objects.filter(id__in=assigned_user_ids).update(
                active_tasks_count=models.Case(
                    models.When(active_tasks_count__gt=0,
                                then=F("active_tasks_count") - 1),
                    default=F("active_tasks_count"),
                    output_field=models.PositiveIntegerField()
                )
            )
        instance.delete()


class TaskStatusUpdateView(APIView):

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):

        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return Response(
                {"error": "Task not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        user = request.user
        is_assigned = TaskAssignment.objects.filter(
            task=task, user=user
        ).exists()

        if not (is_assigned or task.created_by == user or user.role == "ADMIN" or user.is_superuser):
            return Response(
                {"error": "You are not assigned to this task."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = TaskStatusSerializer(
            data=request.data,
            context={"task": task},
        )

        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]

        if new_status == "DONE":
            assigned_user_ids = list(
                TaskAssignment.objects.filter(task=task)
                .values_list("user_id", flat=True)
            )
            if assigned_user_ids:
                User.objects.filter(
                    id__in=assigned_user_ids,
                    active_tasks_count__gt=0,
                ).update(
                    active_tasks_count=F("active_tasks_count") - 1
                )

        task.status = new_status
        task.save(update_fields=["status", "updated_at"])

        assigned_user_ids = list(
            TaskAssignment.objects.filter(task=task).values_list("user_id", flat=True)
        )
        invalidate_many_users_my_eligible_tasks(assigned_user_ids)
        invalidate_task_eligible_users(task.id)

        return Response(TaskSerializer(task).data)
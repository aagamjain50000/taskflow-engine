from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.pagination import PageNumberPagination

from tasks.models import Task
from eligibility.services.rule_engine import RuleEngine
from eligibility.tasks import compute_task_assignment, bulk_recompute_all_tasks
from eligibility.services.cache import (
    eligible_users_cache_key,
    invalidate_task_eligible_users,
)
from accounts.permissions import IsAdmin
from rest_framework.permissions import IsAuthenticated


class EligibleUsersPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class EligibleUsersView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request, task_id):

        page = request.query_params.get("page", 1)
        cache_key = eligible_users_cache_key(task_id, page)

        cached = cache.get(cache_key)

        if cached is not None:
            return Response(cached)

        try:
            task = Task.objects.select_related("rule").get(id=task_id)
        except Task.DoesNotExist:
            return Response(
                {"error": "Task not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        users = RuleEngine.get_eligible_users(task)

        paginator = EligibleUsersPagination()
        page_data = paginator.paginate_queryset(users, request)

        data = [
            {
                "id": u.id,
                "username": u.username,
                "department": u.department,
                "experience_years": u.experience_years,
                "location": u.location,
                "active_tasks_count": u.active_tasks_count,
            }
            for u in page_data
        ]

        response_data = paginator.get_paginated_response(data).data

        cache.set(cache_key, response_data, timeout=300)

        return Response(response_data)


class RecomputeEligibilityView(APIView):

    permission_classes = [IsAdmin]

    def post(self, request):

        task_id = request.data.get("task_id")

        if task_id:
            compute_task_assignment.delay(task_id)

            invalidate_task_eligible_users(task_id)

            return Response({"message": f"Recompute job queued for task {task_id}"})

        else:
            bulk_recompute_all_tasks.delay()

            return Response({"message": "Bulk recompute job queued for all active tasks"})
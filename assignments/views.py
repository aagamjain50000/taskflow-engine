from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination

from assignments.models import TaskAssignment
from eligibility.services.cache import my_eligible_tasks_cache_key


class MyEligibleTasksPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class MyEligibleTasksView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        user_id = request.user.id
        page = request.query_params.get("page", 1)

        cache_key = my_eligible_tasks_cache_key(user_id, page)

        cached = cache.get(cache_key)

        if cached is not None:
            return Response(cached)

        assignments = (
            TaskAssignment.objects
            .select_related("task")
            .filter(user_id=user_id)
            .order_by("-assigned_at")
        )

        paginator = MyEligibleTasksPagination()
        page_data = paginator.paginate_queryset(assignments, request)

        tasks = [
            {
                "task_id": a.task.id,
                "title": a.task.title,
                "status": a.task.status,
                "priority": a.task.priority,
                "due_date": str(a.task.due_date),
                "assigned_at": str(a.assigned_at),
            }
            for a in page_data
        ]

        response_data = paginator.get_paginated_response(tasks).data

        cache.set(cache_key, response_data, timeout=180)

        return Response(response_data)
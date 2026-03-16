from django.urls import path
from tasks.views import TaskListCreateView, TaskDetailView, TaskStatusUpdateView

urlpatterns = [
    path("tasks/", TaskListCreateView.as_view(), name="task-list-create"),
    path("tasks/<int:pk>/", TaskDetailView.as_view(), name="task-detail"),
    path("tasks/<int:pk>/status/", TaskStatusUpdateView.as_view(), name="task-status"),
]
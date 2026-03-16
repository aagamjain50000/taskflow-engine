from django.urls import path
from assignments.views import MyEligibleTasksView

urlpatterns = [
    path("my-eligible-tasks", MyEligibleTasksView.as_view()),
]
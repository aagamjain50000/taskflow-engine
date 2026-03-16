from django.urls import path
from eligibility.views import EligibleUsersView, RecomputeEligibilityView

urlpatterns = [
    path("tasks/<int:task_id>/eligible-users", EligibleUsersView.as_view()),
    path("tasks/recompute-eligibility", RecomputeEligibilityView.as_view(), name="recompute-eligibility"),
]
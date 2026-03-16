"""
URL configuration for taskflow_engine project.
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache

def health_check(request):
    health = {
        "status": "ok",
        "database": "ok",
        "redis": "ok"
    }
    try:
        connection.ensure_connection()
    except Exception as e:
        health["status"] = "error"
        health["database"] = str(e)
    try:
        cache.set("health_check", "ok", timeout=5)
        if cache.get("health_check") != "ok":
            raise Exception("Cache mismatch")
    except Exception as e:
        health["status"] = "error"
        health["redis"] = str(e)
    return JsonResponse(health)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("tasks.urls")),
    path("api/", include("eligibility.urls")),
    path("api/", include("assignments.urls")),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/health/", health_check, name="health_check"),
]
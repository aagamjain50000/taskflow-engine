from rest_framework.permissions import BasePermission


def _is_admin(user):
    """Return True if the user has the ADMIN role or is a Django superuser."""
    return user.role == "ADMIN" or user.is_superuser


class IsAdmin(BasePermission):

    def has_permission(self, request, view):

        return (
            request.user
            and request.user.is_authenticated
            and _is_admin(request.user)
        )


class IsManagerOrAdmin(BasePermission):

    def has_permission(self, request, view):

        return (
            request.user
            and request.user.is_authenticated
            and (request.user.role in ("ADMIN", "MANAGER") or request.user.is_superuser)
        )


class IsOwnerOrAdmin(BasePermission):
    """Allow access if user is admin/superuser, owns the object, or is assigned to it."""

    def has_object_permission(self, request, view, obj):

        if _is_admin(request.user):
            return True

        if obj.created_by == request.user:
            return True

        from assignments.models import TaskAssignment
        return TaskAssignment.objects.filter(
            task=obj, user=request.user
        ).exists()

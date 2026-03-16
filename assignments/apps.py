from django.apps import AppConfig


class AssignmentsConfig(AppConfig):
    name = "assignments"

    def ready(self):
        import assignments.signals  # noqa: F401

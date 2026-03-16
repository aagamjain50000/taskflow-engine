import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

BATCH_SIZE = 5000


class Command(BaseCommand):
    help = "Seed database with 100K test users"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=100000,
            help="Number of users to create (default: 100000)",
        )

    def handle(self, *args, **kwargs):

        count = kwargs["count"]

        departments = ["Finance", "HR", "IT", "Operations"]
        locations = ["Delhi", "Mumbai", "Bangalore", "Remote"]
        roles = ["USER", "USER", "USER", "USER", "MANAGER"]  # weighted

        users = []

        for i in range(count):

            user = User(
                username=f"user_{i}",
                email=f"user_{i}@example.com",
                role=random.choice(roles),
                department=random.choice(departments),
                experience_years=random.randint(1, 15),
                location=random.choice(locations),
                active_tasks_count=0,
            )

            user.set_password("password123")

            users.append(user)

            if len(users) >= BATCH_SIZE:
                User.objects.bulk_create(users, ignore_conflicts=True)
                self.stdout.write(f"Created {i + 1} users...")
                users = []

        if users:
            User.objects.bulk_create(users, ignore_conflicts=True)

        self.stdout.write(
            self.style.SUCCESS(f"Successfully seeded {count} users")
        )
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class SignupSerializer(serializers.ModelSerializer):

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "password",
            "role",
            "department",
            "experience_years",
            "location",
        ]

    def validate_role(self, value):
        """Prevent self-registration as ADMIN. Admins must be created via createsuperuser."""
        if value == "ADMIN":
            raise serializers.ValidationError(
                "Cannot register as ADMIN. Contact a system administrator."
            )
        return value

    def create(self, validated_data):

        password = validated_data.pop("password")

        user = User(**validated_data)

        user.set_password(password)

        user.save()

        return user


class UserProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "role",
            "department",
            "experience_years",
            "location",
            "active_tasks_count",
        ]
        read_only_fields = ["id", "username", "role", "active_tasks_count"]

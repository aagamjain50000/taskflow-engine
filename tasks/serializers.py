from rest_framework import serializers
from tasks.models import Task
from rules.models import TaskRule


class TaskRuleSerializer(serializers.ModelSerializer):

    class Meta:
        model = TaskRule
        fields = [
            "department",
            "min_experience",
            "max_experience",
            "location",
            "max_active_tasks",
            "departments",
            "locations_allow",
            "locations_deny",
        ]

    def to_internal_value(self, data):
        """
        Backwards compatible rule parsing.

        Accepts:
        - flat fields: department, min_experience, location, max_active_tasks
        - flat fields: departments, max_experience, locations_allow/locations_deny
        - nested helpers:
          - experience: {min, max}
          - locations: {allow: [...], deny: [...]}
        """

        if isinstance(data, dict):
            data = dict(data)

            exp = data.get("experience")
            if isinstance(exp, dict):
                if "min" in exp and "min_experience" not in data:
                    data["min_experience"] = exp.get("min")
                if "max" in exp and "max_experience" not in data:
                    data["max_experience"] = exp.get("max")

            locs = data.get("locations")
            if isinstance(locs, dict):
                if "allow" in locs and "locations_allow" not in data:
                    data["locations_allow"] = locs.get("allow")
                if "deny" in locs and "locations_deny" not in data:
                    data["locations_deny"] = locs.get("deny")

            depts = data.get("departments")
            if isinstance(depts, list) and depts and not data.get("department"):
                data["department"] = depts[0]

            allow = data.get("locations_allow")
            if isinstance(allow, list) and allow and not data.get("location"):
                data["location"] = allow[0]

        return super().to_internal_value(data)

    def validate(self, attrs):
        for k in ("departments", "locations_allow", "locations_deny"):
            if k in attrs and attrs[k] == []:
                attrs[k] = None
        return attrs


class TaskSerializer(serializers.ModelSerializer):

    rule = TaskRuleSerializer()

    class Meta:
        model = Task
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_date",
            "created_by",
            "created_at",
            "updated_at",
            "rule",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]

    def create(self, validated_data):

        rule_data = validated_data.pop("rule")

        task = Task.objects.create(**validated_data)

        TaskRule.objects.create(task=task, **rule_data)

        return task

    def update(self, instance, validated_data):

        rule_data = validated_data.pop("rule", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if rule_data:
            rule = instance.rule
            for attr, value in rule_data.items():
                setattr(rule, attr, value)
            rule.save()

        return instance


VALID_TRANSITIONS = {
    "TODO": ["IN_PROGRESS"],
    "IN_PROGRESS": ["DONE"],
    "DONE": [],
}


class TaskStatusSerializer(serializers.Serializer):

    status = serializers.ChoiceField(
        choices=Task.STATUS_CHOICES
    )

    def validate_status(self, value):

        task = self.context["task"]

        allowed = VALID_TRANSITIONS.get(task.status, [])

        if value not in allowed:

            raise serializers.ValidationError(
                f"Cannot transition from '{task.status}' to '{value}'. "
                f"Allowed transitions: {allowed}"
            )

        return value
from django.core.cache import cache


def my_eligible_tasks_cache_key(user_id: int, page: int | str) -> str:
    return f"my_eligible_tasks:user:{user_id}:page:{page}"


def eligible_users_cache_key(task_id: int, page: int | str) -> str:
    return f"eligible_users:task:{task_id}:page:{page}"


def invalidate_my_eligible_tasks(user_id: int) -> None:
    cache.delete_pattern(f"my_eligible_tasks:user:{user_id}:*")


def invalidate_task_eligible_users(task_id: int) -> None:
    cache.delete_pattern(f"eligible_users:task:{task_id}:*")


def invalidate_many_users_my_eligible_tasks(user_ids) -> None:
    for uid in user_ids:
        invalidate_my_eligible_tasks(int(uid))

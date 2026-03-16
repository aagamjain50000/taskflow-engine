# TaskFlow Engine — Dynamic Rule-Based Task Assignment (Django + Celery)

TaskFlow Engine is a **scalable task management system** where tasks are **not manually assigned**. Instead, each task defines **dynamic assignment rules**, and a background worker computes the best eligible user and creates an assignment.

This repository is structured to meet the “100k users / 1M tasks” performance expectations using:
- **PostgreSQL indexing** for rule filtering and “my tasks” lookups
- **Redis caching** for the most expensive endpoints
- **Celery background jobs** for assignment + recomputation (so APIs stay fast)

---

## Quick start (Docker)

```bash
cp .env.example .env
docker-compose up --build -d
docker-compose exec web python manage.py migrate
```

### Seed data (optional)

```bash
# 100k users (default password: password123)
docker-compose exec web python manage.py seed_data --count 100000

# 1M tasks + rules (queues assignment as a Celery bulk recompute)
docker-compose exec web python manage.py seed_tasks --count 1000000
```

### Create an admin user

Signup **cannot** create `ADMIN` users (by design). Create a Django superuser, then set the app-level role if needed.

```bash
docker-compose exec web python manage.py createsuperuser
```

- If you want this superuser to also pass role-based checks, set `role="ADMIN"` via Django admin (`/admin/`) or Django shell.

### URLs

- **API base**: `http://localhost:8000/api/`
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **Health check**: `http://localhost:8000/api/health/`
- **Frontend**: `http://localhost:3000/`

---

## Architecture overview

```
React SPA  →  Django REST API  →  PostgreSQL
                 │
                 ├─ Redis (cache)
                 └─ Redis (Celery broker/result)
                        ↓
                   Celery worker(s)
```

### Key design decisions

- **Django + DRF**: Fast iteration, strong ORM, permissions, pagination, and an admin UI for debugging data at scale.
- **PostgreSQL**: Relational integrity + indexes for rule filtering and assignment lookups.
- **Redis**: Cache for “hot” endpoints + Celery broker/result backend.
- **Celery**: All expensive assignment/recompute operations happen asynchronously.

---

## Core concepts (models)

- **`accounts.User`**: Extends `AbstractUser` with `role`, `department`, `experience_years`, `location`, `active_tasks_count`
- **`tasks.Task`**: `status` (TODO → IN_PROGRESS → DONE), `priority`, `due_date`, `created_by`
- **`rules.TaskRule`**: One-to-one with `Task`. Stores assignment rules.
  - fields (simple): `department`, `min_experience`, `location`, `max_active_tasks`
  - fields (optional, SQL-queryable): `departments[]`, `max_experience`, `locations_allow[]`, `locations_deny[]`
- **`assignments.TaskAssignment`**: Links a `Task` to the selected `User`

---

## Rule engine (dynamic assignment)

### Eligibility filters

When assigning a task, the system filters users with (simplified):
- **Department**:
  - If `rule.departments` is set: `user.department IN rule.departments`
  - Else fallback: `user.department == rule.department`
- **Experience**: `user.experience_years >= rule.min_experience` and optional `<= rule.max_experience`
- **Location**:
  - allow-list via `locations_allow`, fallback to single `location`
  - optional deny-list via `locations_deny`
- **Capacity**: `user.active_tasks_count < rule.max_active_tasks`

### Multiple eligible users

If multiple users match, the engine chooses:
- **User with the fewest active tasks**, tie-broken by `id` (`ORDER BY active_tasks_count, id`).

### No eligible users

If none match:
- The task remains **unassigned** (a warning is logged). It can be picked up later after user data/rules change or an admin triggers recompute.

### Concurrency & safety

- Assignments use `TaskAssignment.get_or_create(...)` + a DB **unique constraint** on `(task, user)`.
- `active_tasks_count` increments/decrements use `F()` expressions to reduce race-condition risk.

---

## Background processing (Celery)

### Story 1 — Admin creates task with rules

- `POST /api/tasks/` creates `Task` + `TaskRule`
- A `post_save(Task)` signal queues `compute_task_assignment(task_id)` (small delay via `countdown=2`)
- Worker runs the rule engine and writes a `TaskAssignment` row

### Story 3 — user attributes change

- `pre_save(User)` detects changes to eligibility fields
- `post_save(User)` queues `recompute_user_eligibility(user_id)`
- Worker:
  - removes assignments the user is no longer eligible for
  - attempts to assign unassigned active tasks the user became eligible for

### Story 4 — admin updates task rules

- `post_save(TaskRule)` (when `created=False`) queues `recompute_task_eligibility(task_id)`
- Worker:
  - deletes old assignment(s)
  - decrements old users’ `active_tasks_count`
  - reassigns using current rules

### Bulk recompute

- `POST /api/tasks/recompute-eligibility` with no `task_id` queues a bulk recompute for all active tasks (TODO/IN_PROGRESS), chunked into batches of 1000 task ids.

---

## Database indexing strategy (performance)

These indexes are present in the models/migrations and are designed around the hot query patterns:

- **User eligibility filtering**
  - Single-field indexes: `department`, `experience_years`, `location`, `active_tasks_count`
  - Composite index: `idx_user_eligibility(department, experience_years, active_tasks_count)`
- **Task filtering**
  - `status`, `priority`, `due_date`
- **Assignments (“my tasks”)**
  - Composite index: `idx_assignment_user_status(user, status)`
  - Unique constraint: `unique(task, user)` to prevent duplicates

---

## Caching strategy (sub-200ms target)

Redis caching is applied to the most expensive GET endpoints, with cache keys **scoped by page** (so pagination stays consistent).

### `GET /api/tasks/{id}/eligible-users`

- **Cache key**: `eligible_users:task:{task_id}:page:{page}`
- **TTL**: 5 minutes
- **Invalidation**:
  - On task rule changes / recompute: delete `eligible_users:task:{task_id}:*`
  - On bulk recompute: delete `eligible_users:task:*`

### `GET /api/my-eligible-tasks`

- **Cache key**: `my_eligible_tasks:user:{user_id}:page:{page}`
- **TTL**: 3 minutes
- **Invalidation**:
  - On assignment/recompute: delete `my_eligible_tasks:user:{user_id}:*`
  - On bulk recompute: delete `my_eligible_tasks:user:*`
  - On task status updates and task deletion, impacted users’ caches are invalidated

---

## API documentation (implemented endpoints)

All endpoints are under `/api/` (note: some do **not** have trailing slashes).

### Auth

- `POST /api/signup/` (public)
- `POST /api/token/` (JWT access + refresh)
- `POST /api/token/refresh/`
- `GET|PUT /api/profile/` (JWT)

### Tasks

- `GET /api/tasks/` (JWT, paginated; supports `?status=` and `?priority=`)
- `POST /api/tasks/` (**Manager/Admin**)
- `GET|PUT|PATCH|DELETE /api/tasks/{id}/` (JWT; owner/admin/assigned can access via permissions)
- `PATCH /api/tasks/{id}/status/` (JWT; enforces TODO → IN_PROGRESS → DONE)

### Eligibility

- `GET /api/tasks/{id}/eligible-users` (JWT, cached + paginated)
- `GET /api/my-eligible-tasks` (JWT, cached + paginated)
- `POST /api/tasks/recompute-eligibility` (**Admin**)
  - Optional JSON body: `{ "task_id": 123 }` to recompute a single task

---

## Request example

### Create task with rules

```json
{
  "title": "Ops onboarding batch",
  "description": "Prepare onboarding for new ops hires",
  "priority": 2,
  "due_date": "2026-04-20",
  "rule": {
    "departments": ["Operations", "HR"],
    "experience": { "min": 2, "max": 10 },
    "locations": { "allow": ["Remote", "Bangalore"], "deny": ["Mumbai"] },
    "max_active_tasks": 5
  }
}
```

---

## Tests

```bash
docker-compose exec web python manage.py test
```

---

## Tech stack

- **Backend**: Python 3.11, Django, Django REST Framework
- **DB**: PostgreSQL 15
- **Cache/Broker**: Redis 7
- **Workers**: Celery
- **Auth**: JWT (SimpleJWT)
- **API docs**: drf-spectacular (`/api/docs/`)
- **Frontend**: React (CRA) in `frontend/taskflow-engine`
- **Infra**: Docker + Docker Compose

---

## Repository layout

```
accounts/        # User model, auth endpoints, permissions, user-change signals
tasks/           # Task CRUD + status transitions + task-create signal
rules/           # TaskRule fields
assignments/     # TaskAssignment + /my-eligible-tasks endpoint
eligibility/     # Rule engine + caching helpers + Celery tasks + eligible-users endpoint
taskflow_engine/ # Django project config, URLs, Celery app
frontend/        # React SPA
```

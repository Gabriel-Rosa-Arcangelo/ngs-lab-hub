# AGENTS.md

## Project Overview
LabExportHub is a backend-first portfolio project for asynchronous data exports.

Core stack:
- Django + DRF (API)
- Celery + Redis (background jobs and scheduling)
- PostgreSQL (primary database)
- MinIO (S3-compatible object storage)
- Docker Compose (local orchestration)

Main product flow:
1. Authenticated user creates an export job.
2. Celery worker generates file artifacts (CSV/XLSX/ZIP) and uploads to MinIO.
3. API returns job state and presigned download URLs.
4. Celery beat runs hourly cleanup for expired exports.

## Run Locally
```bash
cp .env.example .env
make up
make migrate
make seed
```

Useful URLs:
- API root: `http://localhost:8000/api/`
- Swagger: `http://localhost:8000/api/docs/`
- MinIO console: `http://localhost:9001`

## Conventions

### API Endpoints
- Add/modify routes in `backend/apps/api/urls.py` (DRF router + extra paths).
- Keep domain logic inside the owning app:
  - views: `backend/apps/<domain>/views.py`
  - serializers: `backend/apps/<domain>/serializers.py`
  - models: `backend/apps/<domain>/models.py`

### Celery Tasks and Scheduling
- Define tasks in `backend/apps/<domain>/tasks.py` with `@shared_task`.
- Keep long-running orchestration in tasks, but put pure formatting/transform code in helpers (e.g. `backend/apps/exports/formatters.py`).
- Register periodic jobs in `backend/config/settings.py` under `CELERY_BEAT_SCHEDULE`.

### Storage and Exports
- Use `backend/apps/exports/s3.py` wrappers for storage operations (upload/delete/presign).
- Export jobs should never return file payloads through web responses; always upload artifacts to S3/MinIO and expose presigned URLs.

### Tests
- Put tests under `backend/apps/<domain>/tests/`.
- Add API permission tests for endpoint behavior and task tests for background-job behavior.

from __future__ import annotations

import os
import tempfile
import time
from datetime import timedelta
from django.utils import timezone
from celery import shared_task
from django.conf import settings

from apps.accounts.models import Profile
from apps.datasets.models import LabResult
from apps.ngs.models import NgsSequence
from .models import ExportJob, ExportEvent
from .formatters import (
    DATASET_LAB_RESULTS,
    DATASET_NGS_PIPELINE,
    DATASET_NGS_TRIMMING,
    build_export_file,
)
from .s3 import put_file, delete_object

PROGRESS_UPDATE_EVERY = 2000
EXPIRE_BATCH_SIZE = 500

LAB_EXPORT_KINDS = {ExportJob.Kind.RAW_TABLE, ExportJob.Kind.TAT_SUMMARY}


def _is_admin_user(user) -> bool:
    if not user:
        return False
    if user.is_superuser:
        return True
    profile = Profile.objects.filter(user=user).only("role").first()
    return bool(profile and profile.role == Profile.Role.ADMIN)


def _resolve_export_queryset(job: ExportJob, since):
    if job.kind in LAB_EXPORT_KINDS:
        queryset = (
            LabResult.objects
            .select_related("unit", "exam_type")
            .filter(collected_at__gte=since)
            .order_by("-collected_at")
        )
        return queryset, DATASET_LAB_RESULTS

    if job.kind == ExportJob.Kind.NGS_TRIMMING_REPORT:
        queryset = (
            NgsSequence.objects
            .filter(created_at__gte=since)
            .only(
                "sample_id",
                "platform",
                "pipeline_status",
                "raw_reads",
                "trimmed_reads",
                "q30_rate_percent",
                "read_length",
                "created_at",
                "created_by_id",
            )
            .order_by("-created_at")
        )
        if job.created_by_id and not _is_admin_user(job.created_by):
            queryset = queryset.filter(created_by_id=job.created_by_id)
        return queryset, DATASET_NGS_TRIMMING

    if job.kind == ExportJob.Kind.NGS_PIPELINE_REPORT:
        queryset = (
            NgsSequence.objects
            .filter(created_at__gte=since)
            .only(
                "sample_id",
                "platform",
                "pipeline_status",
                "trimmed_reads",
                "aligned_reads",
                "mean_depth",
                "variant_count",
                "created_at",
                "created_by_id",
            )
            .order_by("-created_at")
        )
        if job.created_by_id and not _is_admin_user(job.created_by):
            queryset = queryset.filter(created_by_id=job.created_by_id)
        return queryset, DATASET_NGS_PIPELINE

    raise ValueError(f"Unsupported export kind: {job.kind}")


@shared_task(bind=True, ignore_result=True)
def generate_export(self, job_id: str):
    start = time.time()
    job = ExportJob.objects.get(id=job_id)
    job.status = ExportJob.Status.RUNNING
    job.started_at = timezone.now()
    job.error_message = ""
    job.progress_current = 0
    job.progress_total = 0
    job.save(update_fields=["status", "started_at", "error_message", "progress_current", "progress_total"])
    ExportEvent.objects.create(job=job, level=ExportEvent.Level.INFO, message="Export started.")

    try:
        days = int(job.params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        qs, dataset = _resolve_export_queryset(job, since)
        total_rows = qs.count()
        job.progress_total = total_rows
        job.save(update_fields=["progress_total"])
        ExportEvent.objects.create(
            job=job,
            level=ExportEvent.Level.INFO,
            message=f"Preparing {job.file_format.upper()} for {total_rows} rows ({job.kind}).",
        )

        last_persisted = -1

        def persist_progress(current: int):
            nonlocal last_persisted
            if current == last_persisted:
                return
            last_persisted = current
            job.progress_current = current
            job.save(update_fields=["progress_current"])

        with tempfile.TemporaryDirectory(prefix="export-") as temp_dir:
            export_file = build_export_file(
                file_format=job.file_format,
                queryset=qs,
                temp_dir=temp_dir,
                dataset=dataset,
                on_progress=persist_progress,
                progress_every=PROGRESS_UPDATE_EVERY,
            )

            file_size = os.path.getsize(export_file.file_path)
            bucket = settings.S3_BUCKET_EXPORTS
            key = (
                f"exports/{job.created_by_id or 'anon'}/{job.id}/"
                f"{timezone.now().strftime('%Y%m%d%H%M%S')}.{export_file.file_extension}"
            )
            ExportEvent.objects.create(
                job=job,
                level=ExportEvent.Level.INFO,
                message="Uploading export file to storage.",
            )

            put_file(
                bucket=bucket,
                key=key,
                file_path=export_file.file_path,
                content_type=export_file.content_type,
            )

        bucket = settings.S3_BUCKET_EXPORTS
        job.status = ExportJob.Status.READY
        job.finished_at = timezone.now()
        job.row_count = export_file.row_count
        job.file_size_bytes = file_size
        job.duration_ms = int((time.time() - start) * 1000)
        job.s3_bucket = bucket
        job.s3_key = key
        job.expires_at = timezone.now() + timedelta(hours=1)
        job.save()
        ExportEvent.objects.create(
            job=job,
            level=ExportEvent.Level.INFO,
            message=f"Export ready: {export_file.row_count} rows, {file_size} bytes.",
        )

    except Exception as e:
        job.status = ExportJob.Status.FAILED
        job.finished_at = timezone.now()
        job.error_message = str(e)
        job.duration_ms = int((time.time() - start) * 1000)
        job.save(update_fields=["status", "finished_at", "error_message", "duration_ms"])
        ExportEvent.objects.create(job=job, level=ExportEvent.Level.ERROR, message=f"Export failed: {e}")
        raise


@shared_task(bind=True, ignore_result=True)
def cleanup_expired_exports(self, batch_size: int = EXPIRE_BATCH_SIZE):
    now = timezone.now()
    jobs = (
        ExportJob.objects
        .filter(status=ExportJob.Status.READY, expires_at__isnull=False, expires_at__lte=now)
        .order_by("expires_at", "id")
    )

    expired_count = 0
    for job in jobs.iterator(chunk_size=200):
        if expired_count >= batch_size:
            break

        if job.s3_key:
            bucket = job.s3_bucket or settings.S3_BUCKET_EXPORTS
            try:
                delete_object(bucket=bucket, key=job.s3_key)
            except Exception as exc:
                ExportEvent.objects.create(
                    job=job,
                    level=ExportEvent.Level.WARNING,
                    message=f"Failed to delete expired object from storage: {exc}",
                )
                continue
            ExportEvent.objects.create(job=job, level=ExportEvent.Level.INFO, message="Expired export object deleted from storage.")
        else:
            ExportEvent.objects.create(job=job, level=ExportEvent.Level.INFO, message="Expired export had no s3_key; marking as expired.")

        job.status = ExportJob.Status.EXPIRED
        job.save(update_fields=["status"])
        expired_count += 1

    return {"expired_count": expired_count}

from __future__ import annotations

import uuid
from django.conf import settings
from django.db import models

class ExportJob(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING"
        RUNNING = "RUNNING"
        READY = "READY"
        FAILED = "FAILED"
        EXPIRED = "EXPIRED"
        CANCELED = "CANCELED"

    class Kind(models.TextChoices):
        RAW_TABLE = "RAW_TABLE"
        TAT_SUMMARY = "TAT_SUMMARY"
        NGS_TRIMMING_REPORT = "NGS_TRIMMING_REPORT"
        NGS_PIPELINE_REPORT = "NGS_PIPELINE_REPORT"

    class FileFormat(models.TextChoices):
        CSV = "csv"
        XLSX = "xlsx"
        ZIP = "zip"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    kind = models.CharField(max_length=30, choices=Kind.choices, default=Kind.RAW_TABLE)
    file_format = models.CharField(max_length=10, choices=FileFormat.choices, default=FileFormat.CSV)

    params = models.JSONField(default=dict, blank=True)

    row_count = models.IntegerField(default=0)
    file_size_bytes = models.BigIntegerField(default=0)
    duration_ms = models.IntegerField(default=0)
    progress_current = models.IntegerField(default=0)
    progress_total = models.IntegerField(default=0)

    s3_bucket = models.CharField(max_length=255, blank=True, default="")
    s3_key = models.CharField(max_length=1024, blank=True, default="")
    expires_at = models.DateTimeField(null=True, blank=True)

    error_message = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.id} {self.status}"

    @property
    def progress_percent(self) -> int:
        if self.progress_total <= 0:
            return 0
        return min(100, int((self.progress_current * 100) / self.progress_total))


class ExportEvent(models.Model):
    class Level(models.TextChoices):
        INFO = "INFO"
        WARNING = "WARNING"
        ERROR = "ERROR"

    job = models.ForeignKey(ExportJob, on_delete=models.CASCADE, related_name="events")
    level = models.CharField(max_length=10, choices=Level.choices, default=Level.INFO)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ("created_at", "id")

    def __str__(self) -> str:
        return f"{self.job_id} {self.level}: {self.message[:80]}"

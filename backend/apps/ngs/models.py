from __future__ import annotations

from django.conf import settings
from django.db import models


class NgsSequence(models.Model):
    class PipelineStatus(models.TextChoices):
        QUEUED = "QUEUED"
        RUNNING = "RUNNING"
        SUCCEEDED = "SUCCEEDED"
        FAILED = "FAILED"

    sample_id = models.CharField(max_length=64, unique=True)
    sequence = models.TextField()
    platform = models.CharField(max_length=32, default="ILLUMINA")

    raw_reads = models.IntegerField(default=0)
    trimmed_reads = models.IntegerField(default=0)
    aligned_reads = models.IntegerField(default=0)
    read_length = models.IntegerField(default=150)

    q30_rate_percent = models.FloatField(default=0.0)
    mean_depth = models.FloatField(default=0.0)
    variant_count = models.IntegerField(default=0)
    pipeline_status = models.CharField(
        max_length=20,
        choices=PipelineStatus.choices,
        default=PipelineStatus.SUCCEEDED,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="ngs_sequences",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "id")

    def __str__(self) -> str:
        return f"{self.sample_id} ({self.pipeline_status})"

    @property
    def trim_rate_percent(self) -> float:
        if self.raw_reads <= 0:
            return 0.0
        return round((self.trimmed_reads * 100.0) / self.raw_reads, 2)

    @property
    def alignment_rate_percent(self) -> float:
        if self.trimmed_reads <= 0:
            return 0.0
        return round((self.aligned_reads * 100.0) / self.trimmed_reads, 2)

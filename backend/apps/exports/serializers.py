from __future__ import annotations

from rest_framework import serializers
from .models import ExportJob, ExportEvent

class ExportJobCreateSerializer(serializers.ModelSerializer):
    format = serializers.ChoiceField(choices=ExportJob.FileFormat.choices, source="file_format", default=ExportJob.FileFormat.CSV)

    class Meta:
        model = ExportJob
        fields = ["id", "kind", "format", "params"]
        read_only_fields = ["id"]

    def validate_params(self, params: dict) -> dict:
        # Minimal validation for demo purposes
        if not isinstance(params, dict):
            raise serializers.ValidationError("params must be an object")
        days = params.get("days")
        if days is not None:
            if not isinstance(days, int) or days <= 0 or days > 3650:
                raise serializers.ValidationError("params.days must be int between 1 and 3650")
        return params

    def validate_format(self, value: str) -> str:
        allowed = {choice[0] for choice in ExportJob.FileFormat.choices}
        if value not in allowed:
            raise serializers.ValidationError(f"format must be one of: {', '.join(sorted(allowed))}")
        return value

class ExportJobSerializer(serializers.ModelSerializer):
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = ExportJob
        fields = [
            "id", "status", "kind", "file_format", "params",
            "row_count", "file_size_bytes", "duration_ms",
            "progress_current", "progress_total", "progress_percent",
            "s3_bucket", "s3_key", "expires_at",
            "error_message",
            "created_at", "started_at", "finished_at",
        ]

    def get_progress_percent(self, obj: ExportJob) -> int:
        return obj.progress_percent


class ExportEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportEvent
        fields = ["id", "level", "message", "created_at"]

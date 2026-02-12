from rest_framework import serializers

from .models import NgsSequence


class NgsSequenceSerializer(serializers.ModelSerializer):
    trim_rate_percent = serializers.SerializerMethodField()
    alignment_rate_percent = serializers.SerializerMethodField()

    class Meta:
        model = NgsSequence
        fields = [
            "id",
            "sample_id",
            "sequence",
            "platform",
            "raw_reads",
            "trimmed_reads",
            "aligned_reads",
            "read_length",
            "q30_rate_percent",
            "mean_depth",
            "variant_count",
            "pipeline_status",
            "trim_rate_percent",
            "alignment_rate_percent",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "trim_rate_percent", "alignment_rate_percent", "created_at", "updated_at"]

    def validate(self, attrs):
        raw_reads = attrs.get("raw_reads")
        trimmed_reads = attrs.get("trimmed_reads")
        aligned_reads = attrs.get("aligned_reads")

        if raw_reads is not None and raw_reads < 0:
            raise serializers.ValidationError({"raw_reads": "Must be >= 0"})
        if trimmed_reads is not None and trimmed_reads < 0:
            raise serializers.ValidationError({"trimmed_reads": "Must be >= 0"})
        if aligned_reads is not None and aligned_reads < 0:
            raise serializers.ValidationError({"aligned_reads": "Must be >= 0"})

        if raw_reads is not None and trimmed_reads is not None and trimmed_reads > raw_reads:
            raise serializers.ValidationError({"trimmed_reads": "Cannot be greater than raw_reads"})
        if trimmed_reads is not None and aligned_reads is not None and aligned_reads > trimmed_reads:
            raise serializers.ValidationError({"aligned_reads": "Cannot be greater than trimmed_reads"})

        return attrs

    def get_trim_rate_percent(self, obj: NgsSequence) -> float:
        return obj.trim_rate_percent

    def get_alignment_rate_percent(self, obj: NgsSequence) -> float:
        return obj.alignment_rate_percent

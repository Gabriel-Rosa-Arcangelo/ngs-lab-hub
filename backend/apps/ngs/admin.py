from django.contrib import admin

from .models import NgsSequence


@admin.register(NgsSequence)
class NgsSequenceAdmin(admin.ModelAdmin):
    list_display = (
        "sample_id",
        "platform",
        "pipeline_status",
        "raw_reads",
        "trimmed_reads",
        "aligned_reads",
        "variant_count",
        "created_at",
    )
    list_filter = ("platform", "pipeline_status", "created_at")
    search_fields = ("sample_id", "created_by__username")

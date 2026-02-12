from django.contrib import admin
from .models import ExportJob, ExportEvent

@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = (
        "id", "status", "kind", "file_format",
        "progress_current", "progress_total",
        "row_count", "file_size_bytes", "created_at",
    )
    list_filter = ("status", "kind", "file_format")
    search_fields = ("id", "s3_key")


@admin.register(ExportEvent)
class ExportEventAdmin(admin.ModelAdmin):
    list_display = ("job", "level", "created_at")
    list_filter = ("level", "created_at")
    search_fields = ("job__id", "message")

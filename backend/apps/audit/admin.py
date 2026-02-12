from django.contrib import admin
from .models import AuditLog

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "action", "actor", "object_type", "object_id")
    list_filter = ("action",)
    search_fields = ("action", "object_type", "object_id")

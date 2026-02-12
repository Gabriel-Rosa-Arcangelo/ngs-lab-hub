from django.contrib import admin
from .models import LabUnit, ExamType, LabResult

@admin.register(LabUnit)
class LabUnitAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
    search_fields = ("code", "name")

@admin.register(ExamType)
class ExamTypeAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
    search_fields = ("code", "name")

@admin.register(LabResult)
class LabResultAdmin(admin.ModelAdmin):
    list_display = ("unit", "exam_type", "collected_at", "tat_seconds", "status")
    list_filter = ("status", "unit", "exam_type")
    search_fields = ("unit__code", "exam_type__code")

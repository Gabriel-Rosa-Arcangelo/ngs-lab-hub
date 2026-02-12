from rest_framework import serializers
from .models import LabUnit, ExamType, LabResult

class LabUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabUnit
        fields = ["id", "code", "name"]

class ExamTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamType
        fields = ["id", "code", "name"]

class LabResultSerializer(serializers.ModelSerializer):
    unit = LabUnitSerializer(read_only=True)
    exam_type = ExamTypeSerializer(read_only=True)

    class Meta:
        model = LabResult
        fields = [
            "id", "unit", "exam_type",
            "collected_at", "released_at",
            "tat_seconds", "status",
            "patient_age", "patient_sex",
            "created_at",
        ]

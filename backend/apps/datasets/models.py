from __future__ import annotations

from django.db import models

class LabUnit(models.Model):
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

class ExamType(models.Model):
    code = models.CharField(max_length=30, unique=True)
    name = models.CharField(max_length=255)

    def __str__(self) -> str:
        return f"{self.code} - {self.name}"

class LabResult(models.Model):
    class Status(models.TextChoices):
        OK = "OK"
        DELAYED = "DELAYED"
        ERROR = "ERROR"

    unit = models.ForeignKey(LabUnit, on_delete=models.PROTECT, related_name="results")
    exam_type = models.ForeignKey(ExamType, on_delete=models.PROTECT, related_name="results")

    collected_at = models.DateTimeField()
    released_at = models.DateTimeField()

    tat_seconds = models.IntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OK)

    patient_age = models.IntegerField(default=30)
    patient_sex = models.CharField(max_length=10, default="U")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"{self.unit.code}/{self.exam_type.code} TAT={self.tat_seconds}s"

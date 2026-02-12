from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import LabUnit, ExamType, LabResult
from .serializers import LabUnitSerializer, ExamTypeSerializer, LabResultSerializer

class LabUnitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabUnit.objects.all().order_by("code")
    serializer_class = LabUnitSerializer
    permission_classes = [AllowAny]

class ExamTypeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ExamType.objects.all().order_by("code")
    serializer_class = ExamTypeSerializer
    permission_classes = [AllowAny]

class LabResultViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabResult.objects.select_related("unit", "exam_type").all().order_by("-collected_at")
    serializer_class = LabResultSerializer
    permission_classes = [AllowAny]

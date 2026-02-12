from __future__ import annotations

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from drf_spectacular.utils import extend_schema

from apps.accounts.models import Profile
from .models import ExportJob
from .serializers import ExportJobSerializer, ExportJobCreateSerializer, ExportEventSerializer
from .tasks import generate_export
from .s3 import presign_get

class ExportJobViewSet(viewsets.ModelViewSet):
    queryset = ExportJob.objects.all().order_by("-created_at")
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        if not user.is_authenticated:
            return queryset.none()

        if user.is_superuser:
            return queryset

        profile = Profile.objects.filter(user=user).only("role").first()
        if profile and profile.role == Profile.Role.ADMIN:
            return queryset

        return queryset.filter(created_by=user)

    def get_serializer_class(self):
        if self.action == "create":
            return ExportJobCreateSerializer
        return ExportJobSerializer

    def perform_create(self, serializer):
        job = serializer.save(created_by=self.request.user, status=ExportJob.Status.PENDING)
        generate_export.delay(str(job.id))

    @action(detail=True, methods=["post"])
    def presign(self, request, pk=None):
        job: ExportJob = self.get_object()
        if job.status != ExportJob.Status.READY or not job.s3_bucket or not job.s3_key:
            return Response({"detail": "Export not ready."}, status=status.HTTP_409_CONFLICT)

        url = presign_get(job.s3_bucket, job.s3_key, settings.S3_PRESIGNED_EXPIRES)
        return Response({"url": url, "expires_in": settings.S3_PRESIGNED_EXPIRES})

    @extend_schema(responses=ExportEventSerializer(many=True))
    @action(detail=True, methods=["get"])
    def events(self, request, pk=None):
        job: ExportJob = self.get_object()
        serializer = ExportEventSerializer(job.events.all(), many=True)
        return Response(serializer.data)

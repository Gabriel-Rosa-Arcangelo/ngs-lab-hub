from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from apps.accounts.models import Profile

from .models import NgsSequence
from .serializers import NgsSequenceSerializer


class NgsSequenceViewSet(viewsets.ModelViewSet):
    queryset = NgsSequence.objects.all().order_by("-created_at")
    serializer_class = NgsSequenceSerializer
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

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

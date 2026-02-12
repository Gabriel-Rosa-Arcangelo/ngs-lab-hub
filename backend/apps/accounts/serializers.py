from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Profile

User = get_user_model()


class MeSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role"]

    def get_role(self, user) -> str:
        profile = Profile.objects.filter(user=user).only("role").first()
        if profile:
            return profile.role
        return Profile.Role.USER

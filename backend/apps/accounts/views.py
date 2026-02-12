from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .serializers import MeSerializer


class MeView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MeSerializer

    def get_object(self):
        return self.request.user

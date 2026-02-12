from django.urls import include, path
from rest_framework.routers import DefaultRouter
from apps.exports.views import ExportJobViewSet
from apps.datasets.views import LabUnitViewSet, ExamTypeViewSet, LabResultViewSet
from apps.ngs.views import NgsSequenceViewSet
from apps.accounts.views import MeView

router = DefaultRouter()
router.register(r"exports", ExportJobViewSet, basename="exports")
router.register(r"units", LabUnitViewSet, basename="units")
router.register(r"exams", ExamTypeViewSet, basename="exams")
router.register(r"results", LabResultViewSet, basename="results")
router.register(r"ngs/sequences", NgsSequenceViewSet, basename="ngs-sequences")

urlpatterns = [
    path("me/", MeView.as_view(), name="me"),
    path("", include(router.urls)),
]

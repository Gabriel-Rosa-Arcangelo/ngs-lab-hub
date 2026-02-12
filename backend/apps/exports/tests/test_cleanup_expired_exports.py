from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.exports.models import ExportEvent, ExportJob
from apps.exports.tasks import cleanup_expired_exports

User = get_user_model()


class CleanupExpiredExportsTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="cleanup_user", password="pass1234")

    def test_cleanup_deletes_s3_object_and_marks_job_expired(self):
        expired_job = ExportJob.objects.create(
            created_by=self.user,
            status=ExportJob.Status.READY,
            s3_bucket="exports",
            s3_key="exports/user/file.csv",
            expires_at=timezone.now() - timedelta(hours=2),
        )
        still_ready_job = ExportJob.objects.create(
            created_by=self.user,
            status=ExportJob.Status.READY,
            s3_bucket="exports",
            s3_key="exports/user/fresh.csv",
            expires_at=timezone.now() + timedelta(hours=2),
        )

        with patch("apps.exports.tasks.delete_object") as delete_mock:
            cleanup_expired_exports.apply(args=[], throw=True)

        expired_job.refresh_from_db()
        still_ready_job.refresh_from_db()

        self.assertEqual(expired_job.status, ExportJob.Status.EXPIRED)
        self.assertEqual(still_ready_job.status, ExportJob.Status.READY)
        delete_mock.assert_called_once_with(bucket="exports", key="exports/user/file.csv")
        self.assertTrue(
            ExportEvent.objects.filter(job=expired_job, message__icontains="deleted from storage").exists()
        )

    def test_cleanup_marks_expired_when_s3_key_missing(self):
        expired_without_key = ExportJob.objects.create(
            created_by=self.user,
            status=ExportJob.Status.READY,
            s3_bucket="exports",
            s3_key="",
            expires_at=timezone.now() - timedelta(hours=2),
        )

        with patch("apps.exports.tasks.delete_object") as delete_mock:
            cleanup_expired_exports.apply(args=[], throw=True)

        expired_without_key.refresh_from_db()
        self.assertEqual(expired_without_key.status, ExportJob.Status.EXPIRED)
        delete_mock.assert_not_called()
        self.assertTrue(
            ExportEvent.objects.filter(job=expired_without_key, message__icontains="no s3_key").exists()
        )

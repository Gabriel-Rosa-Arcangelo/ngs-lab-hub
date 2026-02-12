import io
import json
import zipfile
from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import Profile
from apps.exports.models import ExportJob
from apps.exports.tasks import generate_export
from apps.ngs.models import NgsSequence

User = get_user_model()


class GenerateNgsExportReportsTests(TestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="ngs_export_a", password="pass1234")
        self.user_b = User.objects.create_user(username="ngs_export_b", password="pass1234")
        self.admin = User.objects.create_user(username="ngs_export_admin", password="pass1234")
        self.admin.profile.role = Profile.Role.ADMIN
        self.admin.profile.save(update_fields=["role"])

        now = timezone.now()
        NgsSequence.objects.create(
            created_by=self.user_a,
            sample_id="A-001",
            sequence="ACGT",
            raw_reads=1000,
            trimmed_reads=900,
            aligned_reads=810,
            q30_rate_percent=91.3,
            mean_depth=50.5,
            variant_count=15,
            pipeline_status=NgsSequence.PipelineStatus.SUCCEEDED,
            created_at=now - timedelta(hours=3),
        )
        NgsSequence.objects.create(
            created_by=self.user_a,
            sample_id="A-002",
            sequence="TGCA",
            raw_reads=800,
            trimmed_reads=700,
            aligned_reads=620,
            q30_rate_percent=88.2,
            mean_depth=42.2,
            variant_count=7,
            pipeline_status=NgsSequence.PipelineStatus.RUNNING,
            created_at=now - timedelta(hours=2),
        )
        NgsSequence.objects.create(
            created_by=self.user_b,
            sample_id="B-001",
            sequence="TTAA",
            raw_reads=1200,
            trimmed_reads=1100,
            aligned_reads=980,
            q30_rate_percent=93.5,
            mean_depth=61.4,
            variant_count=22,
            pipeline_status=NgsSequence.PipelineStatus.SUCCEEDED,
            created_at=now - timedelta(hours=1),
        )

    def test_non_admin_trimming_report_contains_only_own_sequences(self):
        job = ExportJob.objects.create(
            created_by=self.user_a,
            kind=ExportJob.Kind.NGS_TRIMMING_REPORT,
            file_format=ExportJob.FileFormat.CSV,
            params={"days": 30},
        )
        captured = {}

        def fake_put_file(bucket: str, key: str, file_path: str, content_type: str):
            with open(file_path, "rb") as file_obj:
                captured["data"] = file_obj.read()
            captured["content_type"] = content_type
            captured["key"] = key

        with patch("apps.exports.tasks.put_file", side_effect=fake_put_file):
            generate_export.apply(args=[str(job.id)], throw=True)

        job.refresh_from_db()
        self.assertEqual(job.status, ExportJob.Status.READY)
        self.assertEqual(job.row_count, 2)
        self.assertTrue(captured["key"].endswith(".csv"))
        self.assertEqual(captured["content_type"], "text/csv")

        csv_text = captured["data"].decode("utf-8")
        self.assertIn("sample_id,platform,pipeline_status,raw_reads,trimmed_reads,trim_rate_percent", csv_text)
        self.assertIn("A-001", csv_text)
        self.assertIn("A-002", csv_text)
        self.assertNotIn("B-001", csv_text)

    def test_admin_pipeline_report_zip_contains_all_sequences_and_summary(self):
        job = ExportJob.objects.create(
            created_by=self.admin,
            kind=ExportJob.Kind.NGS_PIPELINE_REPORT,
            file_format=ExportJob.FileFormat.ZIP,
            params={"days": 30},
        )
        captured = {}

        def fake_put_file(bucket: str, key: str, file_path: str, content_type: str):
            with open(file_path, "rb") as file_obj:
                captured["data"] = file_obj.read()
            captured["content_type"] = content_type
            captured["key"] = key

        with patch("apps.exports.tasks.put_file", side_effect=fake_put_file):
            generate_export.apply(args=[str(job.id)], throw=True)

        job.refresh_from_db()
        self.assertEqual(job.status, ExportJob.Status.READY)
        self.assertEqual(job.row_count, 3)
        self.assertTrue(captured["key"].endswith(".zip"))
        self.assertEqual(captured["content_type"], "application/zip")

        with zipfile.ZipFile(io.BytesIO(captured["data"])) as archive:
            names = set(archive.namelist())
            self.assertIn("results.csv", names)
            self.assertIn("summary.json", names)
            csv_text = archive.read("results.csv").decode("utf-8")
            summary = json.loads(archive.read("summary.json").decode("utf-8"))

        self.assertIn("A-001", csv_text)
        self.assertIn("A-002", csv_text)
        self.assertIn("B-001", csv_text)
        self.assertEqual(summary["counts"]["total"], 3)
        self.assertEqual(summary["total_variants"], 44)

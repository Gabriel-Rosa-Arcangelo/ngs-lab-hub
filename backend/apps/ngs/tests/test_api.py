from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Profile
from apps.ngs.models import NgsSequence

User = get_user_model()


class NgsSequenceApiTests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="ngs_a", password="pass1234")
        self.user_b = User.objects.create_user(username="ngs_b", password="pass1234")
        self.admin_user = User.objects.create_user(username="ngs_admin", password="pass1234")
        self.admin_user.profile.role = Profile.Role.ADMIN
        self.admin_user.profile.save(update_fields=["role"])

        self.user_a_sequence = NgsSequence.objects.create(
            created_by=self.user_a,
            sample_id="A-001",
            sequence="ACGTACGT",
            raw_reads=1000,
            trimmed_reads=900,
            aligned_reads=810,
            q30_rate_percent=91.1,
            mean_depth=48.2,
            variant_count=23,
            pipeline_status=NgsSequence.PipelineStatus.SUCCEEDED,
        )
        self.user_b_sequence = NgsSequence.objects.create(
            created_by=self.user_b,
            sample_id="B-001",
            sequence="TTGGCCAA",
            raw_reads=1200,
            trimmed_reads=1000,
            aligned_reads=860,
            q30_rate_percent=88.0,
            mean_depth=52.7,
            variant_count=19,
            pipeline_status=NgsSequence.PipelineStatus.RUNNING,
        )

    def test_user_only_lists_own_sequences(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(reverse("ngs-sequences-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["sample_id"], self.user_a_sequence.sample_id)

    def test_admin_can_list_all_sequences(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("ngs-sequences-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_create_sequence_sets_created_by_from_authenticated_user(self):
        self.client.force_authenticate(user=self.user_a)

        payload = {
            "sample_id": "A-NEW-001",
            "sequence": "GATTACAGATTACA",
            "platform": "ONT",
            "raw_reads": 3000,
            "trimmed_reads": 2700,
            "aligned_reads": 2500,
            "read_length": 151,
            "q30_rate_percent": 93.2,
            "mean_depth": 75.6,
            "variant_count": 41,
            "pipeline_status": "SUCCEEDED",
        }

        response = self.client.post(reverse("ngs-sequences-list"), data=payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = NgsSequence.objects.get(sample_id="A-NEW-001")
        self.assertEqual(created.created_by_id, self.user_a.id)

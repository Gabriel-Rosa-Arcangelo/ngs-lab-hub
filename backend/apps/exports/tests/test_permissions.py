from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import Profile
from apps.exports.models import ExportJob, ExportEvent

User = get_user_model()


class ExportJobPermissionsTests(APITestCase):
    def setUp(self):
        self.user_a = User.objects.create_user(username="user_a", password="pass1234")
        self.user_b = User.objects.create_user(username="user_b", password="pass1234")
        self.admin_user = User.objects.create_user(username="admin_user", password="pass1234")
        self.admin_user.profile.role = Profile.Role.ADMIN
        self.admin_user.profile.save(update_fields=["role"])

        self.user_a_job = ExportJob.objects.create(created_by=self.user_a)
        self.user_b_job = ExportJob.objects.create(created_by=self.user_b)
        ExportEvent.objects.create(job=self.user_a_job, level=ExportEvent.Level.INFO, message="User A event")
        ExportEvent.objects.create(job=self.user_b_job, level=ExportEvent.Level.INFO, message="User B event")

    def test_user_only_lists_own_jobs(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(reverse("exports-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.user_a_job.id))

    def test_user_cannot_retrieve_other_user_job(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(reverse("exports-detail", kwargs={"pk": self.user_b_job.id}))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_list_and_retrieve_all_jobs(self):
        self.client.force_authenticate(user=self.admin_user)

        list_response = self.client.get(reverse("exports-list"))
        detail_response = self.client.get(reverse("exports-detail", kwargs={"pk": self.user_b_job.id}))

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(list_response.data["count"], 2)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["id"], str(self.user_b_job.id))

    def test_user_can_read_own_job_events(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(reverse("exports-events", kwargs={"pk": self.user_a_job.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["message"], "User A event")

    def test_user_cannot_read_other_user_events(self):
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(reverse("exports-events", kwargs={"pk": self.user_b_job.id}))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_admin_can_read_any_job_events(self):
        self.client.force_authenticate(user=self.admin_user)

        response = self.client.get(reverse("exports-events", kwargs={"pk": self.user_b_job.id}))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["message"], "User B event")

    def test_user_without_profile_does_not_crash_listing(self):
        self.user_a.profile.delete()
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(reverse("exports-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], str(self.user_a_job.id))

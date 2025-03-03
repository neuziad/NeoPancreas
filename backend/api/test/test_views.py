from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django_celery_beat.models import PeriodicTask
from api.models import UserProfile, GlucoseReading
from datetime import date, datetime


class RegisterUserViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_user(self):
        """Ensure user registration works correctly."""
        data = {
            "username": "newuser",
            "password": "testpassword",
            "email": "newuser@example.com",
            "profile": {
                "dob": "2000-01-01",
            },
        }
        response = self.client.post("/api/user/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())


class SimulationViewTest(TestCase):
    def setUp(self):
        """Create a test user and mock Celery tasks."""
        self.user = User.objects.create_user(
            username="testuser", password="securepassword"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            dob=date(2000, 1, 1),
            basal_rate=1.2,
            glucose_target=6.4,
            glucose_min=3.9,
            glucose_max=11.0,
            bolus_max=15.0,
            carb_ratio=10.0,
            insulin_duration=240,
            iob=0.0,
            cob=0.0,
            max_iob=25.0,
            em_enabled=False,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_simulation_lifecycle(self):
        """Test starting, checking, and stopping a simulation in sequence."""

        # Ensure no periodic task exists before starting
        task_name = f"user-reading-task-{self.user.id}"
        self.assertFalse(PeriodicTask.objects.filter(name=task_name).exists())

        # Step 1: Start simulation
        start_response = self.client.post(f"/api/start-simulation/{self.user.id}/")
        self.assertEqual(start_response.status_code, 200, "Failed to start simulation")
        self.assertTrue(PeriodicTask.objects.filter(name=task_name).exists())

        # Step 2: Check simulation status (should be running)
        status_response = self.client.get(f"/api/simulation-status/{self.user.id}/")
        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(
            status_response.json()["running"], "Simulation should be running"
        )

        # Step 3: Stop simulation
        stop_response = self.client.post(f"/api/stop-simulation/{self.user.id}/")
        self.assertEqual(stop_response.status_code, 200, "Failed to stop simulation")
        self.assertFalse(PeriodicTask.objects.filter(name=task_name).exists())

        # Step 4: Recheck simulation status (should be stopped)
        status_response = self.client.get(f"/api/simulation-status/{self.user.id}/")
        self.assertEqual(status_response.status_code, 200)
        self.assertFalse(
            status_response.json()["running"], "Simulation should be stopped"
        )

    def test_start_simulation_with_invalid_user(self):
        """Ensure simulation start fails with incorrect user ID"""
        response = self.client.post(
            "/api/start-simulation/99924624624699/"
        )  # Non-existent user
        self.assertEqual(response.status_code, 403)

    def test_stop_simulation_with_no_task(self):
        """Ensure stopping simulation fails when no task exists"""
        response = self.client.post(f"/api/stop-simulation/{self.user.id}/")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["message"], "No simulation found")

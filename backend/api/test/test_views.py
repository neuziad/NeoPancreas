from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django_celery_beat.models import PeriodicTask
from api.models import UserProfile, GlucoseReading
from datetime import date, timedelta
from django.utils.timezone import now
from django.urls import reverse


class RegisterUserViewTest(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_user(self):
        """Ensure user registration works correctly."""
        data = {
            "username": "newuser",
            "password": "testpassword",
            "first_name": "John",
            "last_name": "Doe",
            "email": "newuser@example.com",
            "profile": {
                "dob": date(2000, 1, 1),
            },
        }
        response = self.client.post("/api/user/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="newuser").exists())
    
    def test_invalid_register_user(self):
        """Ensure user registration fails with invalid data."""
        data = {
            "username": "newuser",
            "password": "testpassword",
            "first_name": "John",
            "last_name": "Doe",
            "email": "newuser@example.com",
        }
        response = self.client.post("/api/user/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


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
        start_response = self.client.post(f"/api/start-simulation/")
        self.assertEqual(start_response.status_code, 200, "Failed to start simulation")
        self.assertTrue(PeriodicTask.objects.filter(name=task_name).exists())

        # Step 2: Check simulation status (should be running)
        status_response = self.client.get(f"/api/simulation-status/")
        self.assertEqual(status_response.status_code, 200)
        self.assertTrue(
            status_response.json()["running"], "Simulation should be running"
        )

        # Step 3: Stop simulation
        stop_response = self.client.post(f"/api/stop-simulation/")
        self.assertEqual(stop_response.status_code, 200, "Failed to stop simulation")
        self.assertFalse(PeriodicTask.objects.filter(name=task_name).exists())

        # Step 4: Recheck simulation status (should be stopped)
        status_response = self.client.get(f"/api/simulation-status/")
        self.assertEqual(status_response.status_code, 200)
        self.assertFalse(
            status_response.json()["running"], "Simulation should be stopped"
        )

    def test_stop_simulation_with_no_task(self):
        """Ensure stopping simulation fails when no task exists"""
        response = self.client.post(f"/api/stop-simulation/")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["message"], "No simulation found")


class GlucoseReadingsViewTest(TestCase):
    def setUp(self):
        """Set up test user, profile, and glucose readings"""
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.client.force_authenticate(user=self.user)

        # Create user profile
        self.profile = UserProfile.objects.create(
            user=self.user, dob=date(2000, 1, 1), em_enabled=False
        )

        # Create glucose readings
        self.reading1 = GlucoseReading.objects.create(
            patient=self.profile,
            timestamp=now() - timedelta(hours=3),
            reading=5.6,
            trend="↗",
            bolus_injected=1.0,
            basal_injected=0.5,
        )

        self.reading2 = GlucoseReading.objects.create(
            patient=self.profile,
            timestamp=now() - timedelta(hours=5),  # Outside default 4-hour timespan
            reading=4.9,
            trend="→",
            bolus_injected=0.0,
            basal_injected=0.8,
        )

    def test_get_glucose_readings_default_timespan(self):
        """Ensure glucose readings are fetched for the last 4 hours"""
        url = reverse("glucose-readings-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["glucose"], 5.6)
        self.assertEqual(response.data[0]["trend"], "↗")
        self.assertEqual(response.data[0]["bolus_injected"], 1.0)
        self.assertEqual(response.data[0]["basal_injected"], 0.5)

    def test_get_glucose_readings_custom_timespan(self):
        """Ensure glucose readings are fetched for a custom timespan (6 hours)"""
        url = reverse("glucose-readings-list") + "?timespan=6"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Expect both readings since both are within 6 hours
        self.assertEqual(len(response.data), 2)

    def test_get_glucose_readings_unauthenticated(self):
        """Ensure unauthenticated users cannot access the endpoint"""
        self.client.logout()
        url = reverse("glucose-readings-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ToggleExerciseModeTest(TestCase):
    def setUp(self):
        """Set up test user and profile"""
        self.client = APIClient()
        self.user = User.objects.create_user(username="testuser", password="testpass")
        self.client.force_authenticate(user=self.user)

        # Create user profile
        self.profile = UserProfile.objects.create(
            user=self.user, dob=date(2000, 1, 1), em_enabled=False
        )

    def test_toggle_exercise_mode(self):
        """Ensure the exercise mode is toggled correctly"""
        url = reverse("toggle_exercise_mode")

        # First toggle (False → True)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.em_enabled)

        # Second toggle (True → False)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.profile.refresh_from_db()
        self.assertFalse(self.profile.em_enabled)

    def test_toggle_exercise_mode_unauthenticated(self):
        """Ensure unauthenticated users cannot toggle exercise mode"""
        self.client.logout()
        url = reverse("toggle_exercise_mode")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

from decimal import Decimal, getcontext
from django.test import TestCase
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
from datetime import date, timedelta
from django.utils import timezone
from api.models import GlucoseReading, UserProfile
from simulator.tasks import create_reading, set_bolus_called, set_carbs_on_board

getcontext().prec = 3
User = get_user_model()


class SimulatorTests(TestCase):
    def setUp(self):
        """Set up test user and profile before each test."""
        self.user = User.objects.create(username="testuser")
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
            diabetic_profile="adult#001",
        )

    @patch("simulator.tasks.T1DSimEnv")
    @patch("simulator.tasks.GlucoseReading")
    @patch("api.models.GlucoseReading.adjust_for_noise")
    def test_create_reading_creates_new_reading(self, mock_adjust_for_noise, MockGlucoseReading, MockT1DSimEnv):
        """Test that a new glucose reading is created correctly."""
        mock_env = MockT1DSimEnv.return_value
        mock_env.step.return_value.observation = [180.0]  # mg/dL (converted to mmol/L)

        mock_reading = MagicMock()
        MockGlucoseReading.objects.filter.return_value.last.return_value = None
        MockGlucoseReading.return_value = mock_reading

        mock_adjust_for_noise.return_value = 180.0

        create_reading(self.user.id)

        # Ensure a reading was created
        mock_reading.save.assert_called_once()
        self.assertEqual(mock_reading.reading, 10.0)  # 180 mg/dL → 10 mmol/L

    @patch("simulator.tasks.T1DSimEnv")
    @patch("simulator.tasks.GlucoseReading")
    def test_create_reading_updates_existing_reading(self, MockGlucoseReading, MockT1DSimEnv):
        """Test that an existing reading is updated instead of creating a new one."""
        mock_env = MockT1DSimEnv.return_value
        mock_env.step.return_value.observation = [144.0]  # mg/dL (converted to mmol/L)

        existing_reading = MagicMock()
        MockGlucoseReading.objects.filter.return_value.last.return_value = existing_reading

        create_reading(self.user.id)

        # Ensure the existing reading was updated
        self.assertEqual(MockGlucoseReading.objects.filter.return_value.last.return_value.reading, 8.0)  # 144 mg/dL → 8 mmol/L
        existing_reading.save.assert_called_once()

    @patch("simulator.tasks.GlucoseReading.objects.filter")
    def test_old_readings_are_deleted(self, mock_filter):
        """Ensure that glucose readings older than 24 hours are deleted."""
        create_reading(self.user.id)
        actual_timestamp = mock_filter.call_args[1]["timestamp__lt"]
        expected_timestamp = timezone.now() - timedelta(hours=24)

        self.assertAlmostEqual(actual_timestamp.timestamp(), expected_timestamp.timestamp(), delta=2)


    @patch("simulator.tasks.T1DSimEnv")
    @patch("simulator.tasks.GlucoseReading")
    def test_create_reading_applies_insulin_doses(self, MockGlucoseReading, MockT1DSimEnv):
        """Test that basal and bolus insulin doses are properly applied."""
        mock_env = MockT1DSimEnv.return_value
        mock_env.step.return_value.observation = [144.0]  # mg/dL

        mock_reading = MagicMock()
        MockGlucoseReading.objects.filter.return_value.last.return_value = None
        MockGlucoseReading.return_value = mock_reading

        create_reading(self.user.id)

        # Ensure titration functions are called
        self.assertIsNotNone(self.profile.titrate_basal())
        self.assertEqual(mock_reading.basal_injected, self.profile.titrate_basal())

    @patch("simulator.tasks.logger")
    def test_create_reading_handles_missing_user(self, mock_logger):
        """Ensure the function logs an error when the user does not exist."""
        create_reading(9999)

        # Check if the error was logged
        mock_logger.error.assert_called_with("User with ID 9999 not found.")

    def test_bolus_injection_is_called_correctly(self):
        """
        Test that when the global _is_bolus_called is set to True and _carbs_on_board is 50,
        create_reading uses titrate_bolus(50) to set bolus_injected.
        """
        # Set globals directly in the tasks module.
        set_bolus_called(True)
        set_carbs_on_board(50)

        # Call create_reading with the user id as a positional argument.
        create_reading(self.user.id)

        # Retrieve the latest reading for this profile.
        latest_reading = GlucoseReading.objects.filter(patient=self.profile).last()
        self.assertIsNotNone(latest_reading, "No glucose reading was created.")

        # Calculate expected bolus from the profile's titrate_bolus method.
        expected_bolus = Decimal(str(self.profile.titrate_bolus(50)))
        # Compare the bolus injected in the reading with the expected bolus.
        self.assertEqual(
            latest_reading.bolus_injected,
            expected_bolus,
            f"Expected bolus {expected_bolus}, got {latest_reading.bolus_injected}",
        )

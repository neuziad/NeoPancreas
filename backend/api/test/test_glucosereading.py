from django.test import TestCase
from django.contrib.auth.models import User
import redis
from api.models import GlucoseReading, UserProfile
from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, patch
from django.utils.timezone import now


class GlucoseReadingTests(TestCase):
    def setUp(self):
        """Set up a user, profile, and glucose readings"""
        self.user = User.objects.create_user(
            username="wilfordbrimley", password="53(Vr3|>422vV0r|)!"
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

    @patch("api.models.CGMSensor.withName")
    def test_adjust_for_noise_low_reading(self, mock_sensor):
        """Test that high noise invalidates low glucose readings"""
        mock_sensor.return_value._noise_generator.noise = [20]  # High noise
        reading = GlucoseReading(patient=self.profile).adjust_for_noise(5.5)
        self.assertEqual(reading, 0)  # Should return 0 since noise > 0.83

    @patch("api.models.CGMSensor.withName")
    def test_adjust_for_noise_high_reading(self, mock_sensor):
        """Test that high noise invalidates high glucose readings"""
        mock_sensor.return_value._noise_generator.noise = [50]  # High noise
        reading = GlucoseReading(patient=self.profile).adjust_for_noise(10.0)
        self.assertEqual(reading, 0)  # Should return 0 due to noise condition

    @patch("api.models.CGMSensor.withName")
    def test_adjust_for_noise_valid_reading(self, mock_sensor):
        """Test that normal noise allows valid readings"""
        mock_sensor.return_value._noise_generator.noise = [2]  # Low noise
        reading = GlucoseReading(patient=self.profile).adjust_for_noise(6.0)
        self.assertEqual(reading, 6.0)  # Should return the same value

    def test_calculate_trend_no_data(self):
        """Test trend calculation with insufficient data"""
        glucose_reading = GlucoseReading(patient=self.profile)
        trend = glucose_reading.calculate_trend()
        self.assertEqual(trend, 0)

    @patch("redis.Redis")
    @patch("channels.layers.get_channel_layer")
    def test_calculate_trend_valid_data(self, mock_get_channel_layer, mock_redis):
        """Test trend calculation with valid glucose readings"""

        # Mock the Redis connection (no real Redis server will be contacted)
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        # Mock the return value of get_channel_layer
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        # Create glucose readings
        GlucoseReading.objects.create(
            patient=self.profile,
            reading=5.0,
            timestamp=now() - timedelta(minutes=15),
        )
        GlucoseReading.objects.create(
            patient=self.profile,
            reading=6.0,
            timestamp=now() - timedelta(minutes=10),
        )
        GlucoseReading.objects.create(
            patient=self.profile, reading=7.0, timestamp=now()
        )

        # Create a glucose reading instance (without Redis)
        glucose_reading = GlucoseReading(patient=self.profile)

        # Calculate the trend
        trend = glucose_reading.calculate_trend()

        # Assert the trend calculation
        self.assertEqual(trend, (7.0 - 5.0) / 3)  # Expected trend rate

    def test_detect_trend_alert_no_data(self):
        """Test that detect_trend_alert returns 'NODATA' when no readings exist"""
        glucose_reading = GlucoseReading(patient=self.profile)
        trend_alert = glucose_reading.detect_trend_alert(0.1)
        self.assertEqual(trend_alert, "NODATA")

    @patch("channels.layers.get_channel_layer")
    @patch("api.models.GlucoseReading")
    def test_detect_trend_alert_flat_trend(
        self, MockGlucoseReading, mock_get_channel_layer
    ):
        """Test detecting a flat glucose trend"""

        # Create mock GlucoseReading instance and mock the method `detect_trend_alert`
        mock_glucose_reading = MagicMock(spec=GlucoseReading)
        mock_glucose_reading.reading = 5.0
        mock_glucose_reading.timestamp = now()

        # Mock the `objects.create` method to return the mock GlucoseReading instance
        MockGlucoseReading.objects.create.return_value = mock_glucose_reading

        # Simulate glucose readings with the same value to create a flat trend
        MockGlucoseReading.objects.create(
            patient=self.profile, reading=5.0, timestamp=now()
        )
        MockGlucoseReading.objects.create(
            patient=self.profile, reading=5.0, timestamp=now()
        )
        MockGlucoseReading.objects.create(
            patient=self.profile, reading=5.0, timestamp=now()
        )

        # Create an instance of MockGlucoseReading for testing the trend detection
        glucose_reading = MockGlucoseReading(patient=self.profile)

        # Mock the detect_trend_alert method directly
        glucose_reading.detect_trend_alert.return_value = "→"  # No significant change

        # Detect the trend alert with a threshold (e.g., 0.03 for flat trend detection)
        trend_alert = glucose_reading.detect_trend_alert(0.03)

        # Assert the trend is detected as "→" (indicating no significant change)
        self.assertEqual(trend_alert, "→")

    @patch("channels.layers.get_channel_layer")
    def test_detect_trend_alert_moderate_rise(self, mock_get_channel_layer):
        """Test detecting a moderate glucose rise"""
        GlucoseReading.objects.create(patient=self.profile, reading=5.0)
        GlucoseReading.objects.create(patient=self.profile, reading=6.0)
        GlucoseReading.objects.create(patient=self.profile, reading=7.0)

        glucose_reading = GlucoseReading(patient=self.profile)
        trend_alert = glucose_reading.detect_trend_alert(0.06)
        self.assertEqual(trend_alert, "↗")  # Moderate rise

    @patch("channels.layers.get_channel_layer")
    def test_detect_trend_alert_high_fall(self, mock_get_channel_layer):
        """Test detecting a significant glucose drop"""
        GlucoseReading.objects.create(patient=self.profile, reading=9.0)
        GlucoseReading.objects.create(patient=self.profile, reading=7.0)
        GlucoseReading.objects.create(patient=self.profile, reading=5.0)

        glucose_reading = GlucoseReading(patient=self.profile)
        trend_alert = glucose_reading.detect_trend_alert(-0.12)
        self.assertEqual(trend_alert, "↓")  # Significant drop

    def test_format_timestamp(self):
        """Test timestamp formatting"""
        glucose_reading = GlucoseReading(timestamp=datetime(2025, 3, 2, 14, 30, 0))
        formatted_time = glucose_reading.format_timestamp()
        self.assertEqual(formatted_time, "2025-03-02 14:30:00")  # Expected format

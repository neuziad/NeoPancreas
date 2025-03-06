from unittest.mock import patch
from django.forms import ValidationError
from django.test import TestCase
from django.contrib.auth.models import User
import redis
from api.models import UserProfile, GlucoseReading
from datetime import date, timedelta
from django.utils.timezone import now
from decimal import Decimal


class UserProfileTests(TestCase):
    def setUp(self):
        """Set up a user and associated user profile"""
        self.user = User.objects.create_user(
            username="testuser", email="9Lx0k@example.com", password="securepassword"
        )
        self.user.save()

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

    def test_userprofile_creation(self):
        """Ensure UserProfile is created correctly"""
        self.assertEqual(self.profile.user.username, "testuser")
        self.assertEqual(Decimal(str(self.profile.basal_rate)), Decimal("1.2"))

    def test_age_based_diabetic_profile(self):
        """Ensure diabetic profile is set and set based on age"""
        try:
            self.profile.save()
        except ValidationError as e:
            self.fail(f"Validation error occurred: {e}")

        self.assertIsNotNone(self.profile.diabetic_profile)
        self.assertTrue(
            self.profile.diabetic_profile.startswith("adult#0")
        )  # Profile should be generally formatted as "adult#0xx" with numbers 00-10

    def test_invalid_basal_rate(self):
        """Test basal rate validation"""
        with self.assertRaises(ValidationError):
            self.profile.validate_basal_rate(-1)  # Negative value should fail

    def test_invalid_correction_factor(self):
        """Test correction factor validation"""
        with self.assertRaises(ValidationError):
            self.profile.validate_correction_factor(30.0)  # Outside valid range

    def test_invalid_glucose_target(self):
        """Test glucose target validation"""
        with self.assertRaises(ValidationError):
            self.profile.validate_glucose_target(10.0)  # Outside valid range

    def test_update_iob(self):
        """Test insulin on board (IOB) update"""
        self.profile.iob = Decimal("5.0")
        self.profile.last_update_time = now() - timedelta(minutes=60)
        new_iob = self.profile.update_iob()
        self.assertLess(new_iob, Decimal("5.0"))  # IOB should slowly decay over time

    def test_titrate_basal_no_data(self):
        """Ensure basal titration returns 0 when no glucose readings exist"""
        basal_dose = self.profile.titrate_basal()
        self.assertEqual(basal_dose, Decimal("0"))

    def test_titrate_bolus_no_data(self):
        """Ensure bolus titration returns 0 when no glucose readings exist"""
        bolus_dose = self.profile.titrate_bolus(carbs=50)
        self.assertEqual(bolus_dose, Decimal("0"))

    @patch(
        "channels_redis.core.RedisChannelLayer.get_connection",
        lambda *args, **kwargs: redis.Redis(),
    )
    @patch("channels.layers.get_channel_layer")
    def test_titrate_basal_valid_data(self):
        """Test basal insulin titration based on glucose readings"""
        GlucoseReading.objects.create(patient=self.profile, reading=12.0, trend="↑↑")
        basal_dose = self.profile.titrate_basal()
        self.assertGreater(
            basal_dose, Decimal("0")
        )  # Should return a dose in a case of higher glucose reading and rising trend

    @patch(
        "channels_redis.core.RedisChannelLayer.get_connection",
        lambda *args, **kwargs: redis.Redis(),
    )
    @patch("channels.layers.get_channel_layer")
    def test_titrate_bolus_valid_data(self):
        """Test bolus insulin titration based on glucose readings"""
        GlucoseReading.objects.create(patient=self.profile, reading=10.0, trend="↗")
        bolus_dose = self.profile.titrate_bolus(carbs=80)
        self.assertGreater(
            bolus_dose, Decimal("0")
        )  # Should return a dose in even the most insulin sensitive patient

    def test_profile_string_representation(self):
        """Test string representation of UserProfile"""
        self.assertEqual(str(self.profile), f"PROFILE>> {self.user.username}")

    def test_profile_deletion(self):
        """Ensure deleting a user also deletes the associated UserProfile"""
        # Django's test database rollback is causing problems with testing deletion
        # Thus a separate user has been created to test deletion
        user = User.objects.create(username="deletemelol")
        profile = UserProfile.objects.create(user=user, dob=date(2000, 1, 1))

        user_id = user.id
        profile_id = profile.id

        user.delete()

        # Wait for the database to commit the deletion
        self.assertFalse(UserProfile.objects.filter(user_id=user_id).exists())

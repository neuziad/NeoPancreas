from unittest.mock import patch
from django.test import TestCase
from django.contrib.auth.models import User
import redis
from api.models import UserProfile, GlucoseReading
from api.serializers import UserProfileSerializer, UserSerializer, GlucoseSerializer
from datetime import date
from django.utils.timezone import now
from decimal import Decimal


class UserProfileSerializerTest(TestCase):
    def setUp(self):
        """Create a user and associated UserProfile for testing."""
        self.user = User.objects.create_user(
            username="testuser", password="securepassword"
        )
        self.profile = UserProfile.objects.create(
            user=self.user,
            dob=date(2000, 1, 1),
            basal_rate=1.2,
            correction_factor=1.0,
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

    def test_valid_userprofile_serialization(self):
        """Ensure UserProfileSerializer correctly serializes profile data."""
        serializer = UserProfileSerializer(instance=self.profile)
        self.assertEqual(serializer.data["dob"], "2000-01-01")
        self.assertEqual(Decimal(serializer.data["basal_rate"]), Decimal("1.2"))

    def test_invalid_userprofile_missing_fields(self):
        """Ensure missing fields cause serializer validation to fail."""
        invalid_data = {"dob": None}  # Missing required fields
        serializer = UserProfileSerializer(data=invalid_data)
        self.assertFalse(serializer.is_valid())


class UserSerializerTest(TestCase):
    def test_create_user_with_profile(self):
        """Ensure UserSerializer correctly creates a user and profile."""
        data = {
            "username": "newuser",
            "password": "testpassword",
            "email": "newuser@example.com",
            "profile": {
                "dob": "2000-01-01",
                "basal_rate": 1.2,
            },
        }
        serializer = UserSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)

        user = serializer.save()
        self.assertEqual(user.username, "newuser")
        self.assertTrue(UserProfile.objects.filter(user=user).exists())

    def test_invalid_user_serializer(self):
        """Ensure UserSerializer fails when missing required fields"""
        data = {
            "username": "newuser",
            "password": "testpassword",
            # Missing "email" and "profile"
        }
        serializer = UserSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("email", serializer.errors)
        self.assertIn("profile", serializer.errors)


class GlucoseSerializerTest(TestCase):
    def setUp(self):
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
        self.reading = GlucoseReading.objects.create(
            patient=self.profile, timestamp=now(), reading=6.5, trend="→"
        )

    @patch("channels.layers.get_channel_layer")
    def test_glucose_serialization(self):
        """Ensure GlucoseSerializer correctly serializes glucose readings."""
        serializer = GlucoseSerializer(instance=self.reading)
        self.assertEqual(serializer.data["reading"], 6.5)
        self.assertEqual(serializer.data["trend"], "→")

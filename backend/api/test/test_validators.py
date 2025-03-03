from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from api.models import UserProfile
from django.contrib.auth.models import User
from decimal import Decimal


class UserProfileValidatorsTest(TestCase):
    def setUp(self):
        """Set up a test user and profile"""
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

    def test_valid_basal_rate(self):
        """Test valid basal rate values (should pass)"""
        valid_values = [0, 1.2, 5, 14.99, 15]
        for value in valid_values:
            self.profile.validate_basal_rate(Decimal(value))  # No error expected

    def test_invalid_basal_rate(self):
        """Test invalid basal rate values (should raise ValidationError)"""
        invalid_values = [-1, 16, 20]
        for value in invalid_values:
            with self.assertRaises(ValidationError):
                self.profile.validate_basal_rate(Decimal(value))

    def test_valid_correction_factor(self):
        """Test valid correction factor values"""
        valid_values = [0, 1, 10, 22.2]
        for value in valid_values:
            self.profile.validate_correction_factor(Decimal(value))  # No error expected

    def test_invalid_correction_factor(self):
        """Test invalid correction factor values"""
        invalid_values = [-1, 23, 50]
        for value in invalid_values:
            with self.assertRaises(ValidationError):
                self.profile.validate_correction_factor(Decimal(value))

    def test_valid_glucose_target(self):
        """Test valid glucose target values"""
        valid_values = [6.1, 7.0, 8.3]
        for value in valid_values:
            self.profile.validate_glucose_target(Decimal(value))  # No error expected

    def test_invalid_glucose_target(self):
        """Test invalid glucose target values"""
        invalid_values = [5.9, 9.0, 10.5]
        for value in invalid_values:
            with self.assertRaises(ValidationError):
                self.profile.validate_glucose_target(Decimal(value))

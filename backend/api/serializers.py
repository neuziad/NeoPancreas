from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import GlucoseReading
from .models import UserProfile

User = get_user_model()


class UserProfileSerializer(serializers.ModelSerializer):
    dob = serializers.DateField(format="%Y-%m-%d", input_formats=["%Y-%m-%d"])

    class Meta:
        model = UserProfile
        fields = "__all__"
        extra_kwargs = {
            "user": {"required": False},
            "basal_rate": {"default": 1.2},
            "correction_factor": {"default": 1.0},
            "glucose_target": {"default": 6.4},
            "glucose_min": {"default": 3.9},
            "glucose_max": {"default": 11.0},
            "bolus_max": {"default": 15.00},
            "carb_ratio": {"default": 10.0},
            "insulin_duration": {"default": 240},
            "iob": {"default": 0.00},
            "cob": {"default": 0.00},
            "max_iob": {"default": 25.0},
            "diabetic_profile": {"required": False},
            "em_enabled": {"default": False},
            "carb_ratio": {"default": 10.0},
            "last_update_time": {"read_only": True},
        }

    def create(self, validated_data):
        return super().create(validated_data)


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=True)  # Handle extra user fields

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "profile",
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True},
        }

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)
        user = User.objects.create_user(
            **validated_data
        )  # Hashes password automatically

        if profile_data:
            UserProfile.objects.create(user=user, **profile_data)

        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        instance.first_name = validated_data.get("first_name", instance.first_name)
        instance.last_name = validated_data.get("last_name", instance.last_name)
        instance.email = validated_data.get("email", instance.email)

        if "password" in validated_data:
            instance.set_password(validated_data["password"])  # Hash new password

        instance.save()

        # Update profile separately
        profile = instance.profile
        profile.dob = profile_data.get("dob", profile.dob)
        profile.save()

        return instance


class GlucoseSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlucoseReading
        fields = ["id", "timestamp", "reading", "trend", "patient"]
        extra_kwargs = {"patient": {"read_only": True}}

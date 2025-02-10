import datetime
import random
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import GlucoseReading

from .models import UserProfile  # Import profile model if using one

User = get_user_model()

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "first_name", "last_name", "email", "dob", 
            "basal_rate", "correction_factor", "glucose_target", 
            "glucose_min", "glucose_max", "bolus_max", 
            "carb_ratio", "insulin_duration", "iob", "cob", 
            "max_iob", "residual_iob", "diabetic_profile"
        ]
        extra_kwargs = {
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
            "residual_iob": {"default": 0.0},
            "diabetic_profile": {"required": False},
        }
    
    def create(self, validated_data):
        # # Get dob from validated_data
        # dob = validated_data.get("dob")

        # if not dob:
        #     raise serializers.ValidationError("Date of birth is required.")
        
        # # Calculate the user's age based on dob
        # year_of_birth = dob.year
        # current_year = datetime.now().year
        # age = current_year - year_of_birth
        
        # # Generate a random 3-digit number for the profiles 0-9
        # random_number = str(random.randint(0, 999)).zfill(3)
        
        # # Determine the diabetic profile type based on age
        # if age >= 18:
        #     diabetic_profile = f"adult#{random_number}"
        # else:
        #     diabetic_profile = f"adolescent#{random_number}"

        # validated_data["diabetic_profile"] = diabetic_profile

        # Call the super() method to actually create the UserProfile instance
        return super().create(validated_data)


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=True)  # Handle extra user fields

    class Meta:
        model = User
        fields = ["id", "username", "password", "profile"]  
        extra_kwargs = {
            "password": {"write_only": True},  # Prevent password from being returned in responses
            "email": {"required": True},  # Ensure email is mandatory
        }

    def create(self, validated_data):
        profile_data = validated_data.pop("profile", None)  
        user = User.objects.create_user(**validated_data)  # Hashes password automatically

        if profile_data:
            UserProfile.objects.create(user=user, **profile_data)
        
        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", None)
        instance.username = validated_data.get("username", instance.username)
        instance.email = validated_data.get("email", instance.email)

        if "password" in validated_data:
            instance.set_password(validated_data["password"])  # Hash new password

        instance.save()

        if profile_data:
            UserProfile.objects.update_or_create(user=instance, defaults=profile_data)

        return instance


class GlucoseSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlucoseReading
        fields = ["id", "timestamp", "reading", "trend", "patient"]
        extra_kwargs = {"patient": {"read_only": True}}

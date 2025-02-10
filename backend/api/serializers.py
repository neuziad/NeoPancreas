from django.contrib.auth.models import User
from rest_framework import serializers
from .models import GlucoseReading


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class GlucoseSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlucoseReading
        fields = ["id", "timestamp", "adjusted_reading", "trend_alert", "patient"]
        extra_kwargs = {"patient": {"read_only": True}}

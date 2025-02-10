from django.db import models
from django.contrib.auth.models import User


class GlucoseReading(models.Model):
    """Represents a single glucose reading with its metadata."""

    timestamp = models.DateTimeField(auto_now_add=True)
    adjusted_reading = models.FloatField()
    trend_alert = models.CharField(max_length=6)
    patient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="glucose_readings"
    )

    def __str__(self):
        return f"GLUCOSE>> [{self.timestamp}] | {self.adjusted_reading:.1f} mmoL/L | {self.trend_alert}"

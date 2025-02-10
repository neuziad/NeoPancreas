from datetime import datetime
import random
from django.db import models
from django.contrib.auth.models import User

class UserProfile(models.Model):
    # Personal details
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    dob = models.DateField(null=True, blank=True)

    # Diabetic parameters
    basal_rate = models.DecimalField(decimal_places=2, max_digits=4, default=1.2)
    correction_factor = models.DecimalField(decimal_places=1, max_digits=3, default=1.0)
    glucose_target = models.DecimalField(decimal_places=1, max_digits=3, default=6.4)
    glucose_min = models.DecimalField(decimal_places=1, max_digits=3, default=3.9)
    glucose_max = models.DecimalField(decimal_places=1, max_digits=3, default=11.0)
    bolus_max = models.DecimalField(decimal_places=2, max_digits=4, default=15.00)
    carb_ratio = models.DecimalField(decimal_places=1, max_digits=3, default=10.0)
    insulin_duration = models.IntegerField(default=240)
    iob = models.DecimalField(decimal_places=2, max_digits=4, default=0.00)
    cob = models.DecimalField(decimal_places=2, max_digits=4, default=0.00)
    max_iob = models.DecimalField(decimal_places=2, max_digits=4, default=25.0)
    residual_iob = models.FloatField(default=0.0)
    diabetic_profile = models.CharField(max_length=14, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.diabetic_profile:
            # Calculate the age from dob
            year_of_birth = self.dob.year
            current_year = datetime.now().year
            age = current_year - year_of_birth

            # Generate a random number
            random_number = str(random.randint(0, 9)).zfill(3)

            # Set diabetic_profile based on age
            if age >= 18:
                self.diabetic_profile = f"adult#{random_number}"
            else:
                self.diabetic_profile = f"adolescent#{random_number}"
        
        super().save(*args, **kwargs)  # Save the instance to the database
    
    def __str__(self):
        return f"PROFILE>> {self.user.username}"


class GlucoseReading(models.Model):
    """Represents a single glucose reading with its metadata."""

    timestamp = models.DateTimeField(auto_now_add=True)
    reading = models.FloatField()
    trend = models.CharField(max_length=6)
    patient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="glucose_readings"
    )

    def __str__(self):
        return f"GLUCOSE>> [{self.timestamp}] | {self.reading:.1f} mmoL/L | {self.trend}"

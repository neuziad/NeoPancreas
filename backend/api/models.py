from datetime import datetime
import random
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy
import math
from decimal import Decimal, getcontext
import numpy as np
from simglucose.sensor.cgm import CGMSensor
from simglucose.actuator.pump import InsulinPump

getcontext().prec = 3


class UserProfile(models.Model):
    """An extension of Django's User model, adds new personal attributes and diabetic parameters for simulated patients."""

    # Personal details
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    first_name = models.CharField(max_length=30, blank=True)
    last_name = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    dob = models.DateField(null=True, blank=True)

    # Store readings of user
    readings = models.ManyToManyField("GlucoseReading", blank=True)

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
    em_enabled = models.BooleanField(default=False)
    diabetic_profile = models.CharField(
        max_length=14, null=True, blank=True
    )  # Simulation profile for simglucose
    carb_ratio = models.DecimalField(decimal_places=1, max_digits=3, default=10.0)
    last_update_time = models.DateTimeField(
        default=datetime.min.strftime("%Y-%m-%d %H:%M:%S")
    )

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

        super().save(*args, **kwargs)

    ## DATA VALIDATORS
    def validate_basal_rate(self, value):
        if value < 0 or value > 15:
            raise ValidationError(
                gettext_lazy("Basal rate out of range"),
                params={"value": value},
            )

    def validate_correction_factor(self, value):
        if value < 0 or value > 22.2:
            raise ValidationError(
                gettext_lazy("Correction factor out of range"),
                params={"value": value},
            )

    def validate_glucose_target(self, value):
        if value < 6.1 or value > 8.3:
            raise ValidationError(
                gettext_lazy("Glucose target out of range"),
                params={"value": value},
            )

    def validate_glucose_min(self, value):
        if value < 3.9 or value > 6.1:
            raise ValidationError(
                gettext_lazy("Glucose min out of range"),
                params={"value": value},
            )

    def validate_glucose_max(self, value):
        if value < 8.0 or value > 13.0:
            raise ValidationError(
                gettext_lazy("Glucose max out of range"),
                params={"value": value},
            )

    def validate_bolus_max(self, value):
        if value < 0 or value > 40.0:
            raise ValidationError(
                gettext_lazy("Bolus max out of range"),
                params={"value": value},
            )

    def validate_carb_ratio(self, value):
        if value < 0 or value > 60.0:
            raise ValidationError(
                gettext_lazy("Carb ratio out of range"),
                params={"value": value},
            )

    def validate_insulin_duration(self, value):
        if value < 180 or value > 360:
            raise ValidationError(
                gettext_lazy("Insulin duration out of range"),
                params={"value": value},
            )

    def validate_max_iob(self, value):
        if value < 0 or value > 30.0:
            raise ValidationError(
                gettext_lazy("Max IOB out of range"),
                params={"value": value},
            )

    ## Insulin and glucose calculations
    def update_iob(self):
        current_time = float(datetime.now().timestamp())

        # Initialize time tracking
        if self.last_update_time is None:
            self.last_update_time = current_time

        # Compute time elapsed since last update
        elapsed_time = (current_time - self.last_update_time) / 60
        self.last_update_time = current_time

        # Decay existing IOB
        if self.iob > 0:
            decay_factor = math.exp(-elapsed_time / self.insulin_duration)
            self.iob *= decay_factor
            # self.iob = round(self.iob / 0.05) * 0.05

        # Process new insulin doses
        new_bolus = 0.0
        new_basal = 0.0
        for reading in self.readings:
            if reading.timestamp > (current_time - 5 * 60):
                new_bolus += reading.bolus_injected
                new_basal += reading.basal_injected

        # Add new insulin doeses
        self.iob += new_bolus
        if new_basal > 0:
            basal_integral = (new_basal * self.insulin_duration) * (
                1 - math.exp(-elapsed_time / self.insulin_duration)
            )
            self.iob += basal_integral

        return self.iob

    def titrate_basal(self):
        """
        Adjusts basal insulin delivery based on glucose levels, trends, and IOB.

        Returns:
        - Adjusted basal insulin dose for the next step (U)
        """

        current_glucose = self.readings[0].reading if self.readings else 0
        target = self.glucose_target
        min_gl = self.glucose_min
        glucose_trend = self.readings[0].trend if self.readings else "NODATA"
        correction_factor = self.correction_factor
        em_enabled = self.em_enabled

        # If full basal rate equivalent is already delivered, or glucose too low, stop basal delivery
        if self.iob > self.basal_rate or current_glucose < min_gl:
            return 0

        # Convert basal rate to per-step insulin dose
        basal_per_step = self.basal_rate / 12

        # Calculate correction dose
        correction_dose = (current_glucose - target) / correction_factor / 12
        basal_per_step += correction_dose

        # Adjust further based on glucose trend
        trend_multipliers = {
            "↑↑": 1.25,
            "↑": 1,
            "↗": 0.75,
            "→": 0.5,
            "↘": 0.1,
            "↓": 0,
            "↓↓": 0,
            "NODATA": 0,
        }
        basal_per_step *= trend_multipliers.get(glucose_trend, 1.0)

        # Reduce insulin if IOB is high (soft limit mechanism)
        if self.iob > 3.0:
            basal_per_step *= float(Decimal(1) / Decimal(self.iob))

        # Apply exercise mode
        if em_enabled:
            basal_per_step *= 0.5

        # Ensure no negative insulin delivery
        basal_per_step = max(0, basal_per_step)

        # Round to nearest 0.05 for insulin precision
        basal_per_step = round(basal_per_step / 0.05) * 0.05

        return basal_per_step

    def titrate_bolus(self, carbs):
        """
        Adjusts bolus insulin delivery based on glucose levels, IOB, and carb input.

        Parameters:
        - carbs: Carbohydrate inputted (g)

        Returns:
        - Adjusted bolus insulin dose for the next step (U)
        """

        current_glucose = self.readings[0].reading if self.readings else 0
        carb_ratio = self.carb_ratio
        correction_factor = self.correction_factor
        target = self.glucose_target
        min_gl = self.glucose_min
        iob = self.iob
        max_bolus = self.bolus_max
        em_enabled = self.em_enabled

        # No bolus when blood glucose is below minimum
        if current_glucose < min_gl:
            return 0

        # Calculate initial bolus value from carbs
        bolus_per_step = carbs / carb_ratio

        # Calculate correction dose and add to bolus value
        bolus_per_step += (current_glucose - target) / correction_factor

        # Apply exercise mode
        if em_enabled:
            bolus_per_step *= 0.5

        # Subtract insulin on board from bolus
        bolus_per_step -= iob

        # Make sure value doesn't go negative or beyond the max bolus
        bolus_per_step = min(max(0, bolus_per_step), max_bolus)

        # Round to nearest 0.05 for insulin precision
        bolus_per_step = round(bolus_per_step / 0.05) * 0.05

        return bolus_per_step

    def delete(self, using=..., keep_parents=...):
        return super().delete(using, keep_parents)

    def __str__(self):
        return f"PROFILE>> {self.user.username}"


class GlucoseReading(models.Model):
    """Represents a single glucose reading with its metadata."""

    patient = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="glucose_readings"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    reading = models.FloatField()
    trend = models.CharField(max_length=6)
    basal_injected = models.DecimalField(decimal_places=2, max_digits=4, default=0.00)
    bolus_injected = models.DecimalField(decimal_places=2, max_digits=4, default=0.00)

    ## Glucose calculations
    def adjust_for_noise(reading):
        """Computes the rolling average noise level from the CGM sensor and removes
        glucose readings based on noise levels per ISO standards. (ISO 15197:2013)"""

        if not CGMSensor.withName("Dexcom")._noise_generator.noise:
            noise = 0
        else:
            noise = np.mean(CGMSensor.withName("Dexcom")._noise_generator.noise) / 18

        if abs(noise) > 0.83 and reading <= 5.55:
            return 0
        if abs(noise) > (0.15 * reading) and reading >= 5.56:
            return 0

        return reading

    def calculate_trend(self):
        """Calculates the trend based on glucose levels over 15 minutes."""
        if len(self.patient.readings) < 3:
            return 0

        past_bg = self.patient.readings[0].reading
        current_bg = self.atient.readings[-1].reading
        return (current_bg - past_bg) / 3

    def detect_trend_alert(self, trend_rate):
        """Detects significant glucose changes and issues alerts."""
        if len(self.patient.readings) < 3:
            trend_alert = "NODATA"
        else:
            # Assign trend category based on Dexcom G7 criteria
            if abs(trend_rate) < 0.0555:
                trend_alert = "→"
            elif 0.0555 <= abs(trend_rate) < 0.111:
                trend_alert = "↗" if trend_rate > 0 else "↘"
            elif 0.111 <= abs(trend_rate) < 0.1665:
                trend_alert = "↑" if trend_rate > 0 else "↓"
            else:
                trend_alert = "↑↑" if trend_rate > 0 else "↓↓"

            if self.patient.readings[0] == 0:
                trend_alert = "NODATA"

        return trend_alert

    def format_timestamp(self):
        return self.timestamp.strftime("%Y-%m-%d %H:%M:%S")

    def __str__(self):
        return f"GLUCOSE>> [{self.timestamp}] | {self.reading:.1f} mmoL/L | {self.trend} | {self.basal_injected:.2f} U Basal | {self.bolus_injected:.2f} U Bolus"

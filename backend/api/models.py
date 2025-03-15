import random
from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy
import math
import numpy as np
from simglucose.sensor.cgm import CGMSensor
from django.utils.timezone import now
from datetime import timedelta
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation, getcontext
import logging

# Constants
getcontext().prec = 3
logger = logging.getLogger(__name__)
EXERCISE_MODE_MODIFIER = Decimal("0.75")


class UserProfile(models.Model):
    """An extension of Django's User model, adds new personal attributes and diabetic parameters for simulated patients."""

    # Personal details
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    dob = models.DateField(null=True, blank=True)

    # Diabetic parameters
    basal_rate = models.DecimalField(decimal_places=2, max_digits=5, default=1.2)
    correction_factor = models.DecimalField(decimal_places=1, max_digits=3, default=1.0)
    glucose_target = models.DecimalField(decimal_places=1, max_digits=4, default=6.4)
    glucose_min = models.DecimalField(decimal_places=1, max_digits=4, default=3.9)
    glucose_max = models.DecimalField(decimal_places=1, max_digits=5, default=11.0)
    bolus_max = models.DecimalField(decimal_places=2, max_digits=5, default=15.00)
    carb_ratio = models.DecimalField(decimal_places=1, max_digits=4, default=10.0)
    insulin_duration = models.IntegerField(default=240)
    iob = models.DecimalField(decimal_places=2, max_digits=5, default=0.00)
    cob = models.DecimalField(decimal_places=2, max_digits=5, default=0.00)
    max_iob = models.DecimalField(decimal_places=2, max_digits=5, default=25.0)
    em_enabled = models.BooleanField(default=False)
    diabetic_profile = models.CharField(
        max_length=14,
        null=True,
        blank=True,  # Simulation profile for simglucose
    )
    carb_ratio = models.DecimalField(decimal_places=1, max_digits=3, default=10.0)
    last_update_time = models.DateTimeField(default=now)

    def save(self, *args, **kwargs):
        if not self.diabetic_profile:
            # Calculate the age from dob
            year_of_birth = self.dob.year
            current_year = now().year
            age = current_year - year_of_birth

            # Set diabetic_profile based on age
            if age < 18:
                raise ValidationError(
                    gettext_lazy(
                        "This app is designed only for patients 18 years or older."
                    )
                )
            elif age >= 18:
                self.diabetic_profile = f"adult#{str(random.randint(1, 10)).zfill(3)}"
                logger.info(
                    "New user's diabetic profile set to: %s", self.diabetic_profile
                )

            self.clean()

        super().save(*args, **kwargs)

    def delete(self, using=..., keep_parents=...):
        return super().delete(using, keep_parents)

    def clean(self):
        self.validate_basal_rate(self.basal_rate)
        self.validate_correction_factor(self.correction_factor)
        self.validate_glucose_target(self.glucose_target)
        self.validate_glucose_min(self.glucose_min)
        self.validate_glucose_max(self.glucose_max)
        self.validate_bolus_max(self.bolus_max)
        self.validate_carb_ratio(self.carb_ratio)
        self.validate_insulin_duration(self.insulin_duration)
        self.validate_max_iob(self.max_iob)

    def __str__(self):
        return f"PROFILE>> {self.user.username}"

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

    ## DIABETIC ALGORITHMS
    def update_iob(self):
        """Estimates the patient's insulin on board by adding past insulin doses and simulating insulin decay."""
        current_time = now()
        if self.last_update_time is None:
            self.last_update_time = current_time

        elapsed_time = (current_time - self.last_update_time).total_seconds() / 60
        self.last_update_time = current_time

        # Decay existing IOB
        if self.iob > 0:
            try:
                decay_factor = Decimal(str(math.exp(-elapsed_time / self.insulin_duration)))
                self.iob = (self.iob * decay_factor).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            except (ValueError, InvalidOperation) as e:
                logger.error(f"IOB decay calculation failed: {e}")
                self.iob = Decimal("0")

        # Process past insulin doses
        new_bolus = Decimal("0")
        new_basal = Decimal("0")
        readings = list(self.glucose_readings.filter(timestamp__gt=self.last_update_time))

        for reading in readings:
            try:
                new_bolus += Decimal(str(reading.bolus_injected or "0"))
                new_basal += Decimal(str(reading.basal_injected or "0"))
            except InvalidOperation as e:
                logger.error(f"Invalid Decimal value in past readings: {e}")

        self.iob += new_bolus
        if new_basal > 0:
            basal_integral = new_basal * (1 - math.exp(-elapsed_time / self.insulin_duration))
            self.iob += basal_integral

        return self.iob

    def titrate_bolus(self, carbs):
        """Adjusts bolus insulin delivery based on glucose levels, IOB, and carb input."""
        try:
            carbs = Decimal(str(carbs)) if carbs else Decimal("0")
        except InvalidOperation:
            logger.error(f"Invalid carbs value: {carbs}")
            carbs = Decimal("0")

        qs = self.glucose_readings.all()
        first_reading = qs.first()
        current_glucose = Decimal(str(first_reading.reading)) if first_reading else Decimal("0")

        if current_glucose < self.glucose_min:
            return Decimal("0")

        bolus_per_step = carbs / self.carb_ratio
        bolus_per_step += (current_glucose - self.glucose_target) / self.correction_factor

        if self.em_enabled:
            bolus_per_step *= EXERCISE_MODE_MODIFIER

        bolus_per_step = min(max(Decimal("0"), bolus_per_step), self.bolus_max)
        return bolus_per_step.quantize(Decimal("0.05"), rounding=ROUND_HALF_UP)

    def titrate_basal(self):
        """
        Adjusts basal insulin delivery based on glucose levels, trends, and IOB.

        Returns:
        - Adjusted basal insulin dose for the next step (U)
        """

        qs = self.glucose_readings.all()

        first_reading = qs.first()
        if first_reading:
            current_glucose = Decimal(str(first_reading.reading))
            glucose_trend = first_reading.trend
        else:
            current_glucose = Decimal("0")
            glucose_trend = "NODATA"

        target = Decimal(str(self.glucose_target))
        min_gl = Decimal(str(self.glucose_min))
        correction_factor = Decimal(str(self.correction_factor))
        em_enabled = self.em_enabled

        # If full basal rate equivalent is already delivered, or glucose too low, stop basal delivery
        if self.iob > self.basal_rate or current_glucose < min_gl:
            return Decimal("0")

        # Convert basal rate to per-step insulin dose (Decimal division)
        basal_per_step = Decimal(str(self.basal_rate)) / Decimal("12")

        # Calculate correction dose with Decimal conversion
        correction_dose = (current_glucose - target) / correction_factor / Decimal("12")
        basal_per_step += correction_dose

        # Adjust further based on glucose trend
        trend_multipliers = {
            "↑↑": Decimal("1.25"),
            "↑": Decimal("1"),
            "↗": Decimal("0.75"),
            "→": Decimal("0.5"),
            "↘": Decimal("0.1"),
            "↓": Decimal("0"),
            "↓↓": Decimal("0"),
            "NODATA": Decimal("0"),
        }
        basal_per_step *= trend_multipliers.get(glucose_trend, Decimal("1.0"))

        # Apply exercise mode modifier
        if em_enabled:
            basal_per_step *= Decimal(str(EXERCISE_MODE_MODIFIER))

        # Ensure no negative insulin delivery
        basal_per_step = max(Decimal("0"), basal_per_step)

        # Round to nearest 0.05 for pump precision
        basal_per_step = (basal_per_step / Decimal("0.05")).quantize(
            Decimal("1")
        ) * Decimal("0.05")

        return basal_per_step


class GlucoseReading(models.Model):
    """Represents a single glucose reading with its metadata."""

    patient = models.ForeignKey(
        UserProfile, on_delete=models.CASCADE, related_name="glucose_readings"
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    reading = models.FloatField()
    trend = models.CharField(max_length=6)
    basal_injected = models.DecimalField(decimal_places=2, max_digits=4, default=0.00)
    bolus_injected = models.DecimalField(decimal_places=2, max_digits=4, default=0.00)

    ## Glucose calculations
    def adjust_for_noise(self, reading):
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
        qs = self.patient.glucose_readings.all()
        if qs.count() < 3:
            return 0

        past_bg = qs[qs.count() - 3].reading  # Reading every 5 minutes = 4th to last
        current_bg = qs.last().reading
        return (current_bg - past_bg) / 3

    def detect_trend_alert(self, trend_rate):
        """Detects significant glucose changes and issues alerts."""
        qs = self.patient.glucose_readings.all()
        if qs.count() < 3:
            return "NODATA"
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

            if qs[0].reading == 0:
                trend_alert = "NODATA"

        return trend_alert

    def format_timestamp(self):
        return self.timestamp.strftime("%Y-%m-%d %H:%M:%S")

    def __str__(self):
        return f"GLUCOSE>> [{self.timestamp}] | {self.reading:.1f} mmoL/L | {self.trend} | {self.basal_injected:.2f} U Basal | {self.bolus_injected:.2f} U Bolus"

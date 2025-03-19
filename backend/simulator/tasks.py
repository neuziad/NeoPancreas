import logging
import django
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from simglucose.simulation.env import T1DSimEnv
from simglucose.patient.t1dpatient import T1DPatient
from simglucose.sensor.cgm import CGMSensor
from simglucose.actuator.pump import InsulinPump
from simglucose.simulation.scenario_gen import RandomScenario
from simglucose.controller.base import Action, Controller
from decimal import Decimal, getcontext
from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth.models import User
from api.models import GlucoseReading

# Constants
django.setup()
getcontext().prec = 3
logger = logging.getLogger(__name__)
User = get_user_model()


# Create a reading and apply the necessary insulin
@shared_task
def create_reading(*args):
    try:
        # Get the user from the database
        user_id = int(args[0])
        user = User.objects.get(id=user_id)

        # Initialise simulation environment
        env = T1DSimEnv(
            patient=T1DPatient.withName(user.profile.diabetic_profile),
            sensor=CGMSensor.withName("Dexcom"),
            pump=InsulinPump.withName("Insulet"),
            scenario=RandomScenario(
                start_time=timezone.now().replace(tzinfo=None), seed=user_id
            ),
        )

        # Check if previous readings exist
        latest_reading = user.profile.glucose_readings.all().last()

        if latest_reading:
            # Use actual past insulin doses if available
            basal_dose = float(latest_reading.basal_injected)
            bolus_dose = float(latest_reading.bolus_injected)
        else:
            # No previous readings - use default values
            basal_dose = 0
            bolus_dose = 0

        # Run the insulin doses through the simulator
        obs = env.step(Action(basal=basal_dose, bolus=bolus_dose)).observation

        if not obs or len(obs) == 0:  # Debugging
            logger.error("Observation data is empty, cannot retrieve glucose reading.")
            return

        # Process the new glucose reading
        try:
            reading_value = float(obs[0]) / 18  # Convert mg/dL to mmol/L
        except Exception as e:
            # Weirdly enough, if a user isn't logged in properly, simglucose won't thrown an exception
            # Instead, it will return a Decimal, which can't be divided with the float number 18
            # A strange error but at least we know why it may happen
            logger.error(
                "Error processing glucose reading, user may not be authenticated properly."
            )
            return

        # Determine the current time and calculate the 5-minute block
        current_time = timezone.now()
        block_start = current_time.replace(second=0, microsecond=0)

        # Round down to the nearest 5-minute mark:
        block_start = block_start - timedelta(minutes=(block_start.minute % 5))

        # Look for an existing reading in the last 24 hours with the same hour and minute as block_start
        existing_reading = user.profile.glucose_readings.filter(
            timestamp__gte=current_time - timedelta(hours=24),
            timestamp__hour=block_start.hour,
            timestamp__minute=block_start.minute,
        ).last()

        # If previous reading at same time exists, replace it, if not, create new reading
        if existing_reading:
            new_reading = existing_reading
        else:
            new_reading = GlucoseReading(patient=user.profile)

        # Update reading data
        new_reading.reading = (
            float(new_reading.adjust_for_noise(reading_value))
            if new_reading.adjust_for_noise(reading_value) is not None
            else 0
        )

        # Calculate trend data
        trend_rate = new_reading.calculate_trend()
        new_reading.trend = new_reading.detect_trend_alert(trend_rate)

        # Generate insulin doses
        basal_dose = user.profile.titrate_basal()
        if user.profile.em_enabled:
            basal_dose *= Decimal("0.75")
            
        new_reading.basal_injected = Decimal(str(basal_dose))
        new_reading.bolus_injected = Decimal(str(user.profile.pending_bolus))

        # Reset pending bolus on user profile if bolus was injected
        if user.profile.pending_bolus > 0:
            user.profile.pending_bolus = 0
            user.profile.save()

        # Update the timestamp to the current time so that it reflects today's reading
        # and save new reading
        new_reading.timestamp = current_time
        new_reading.save()

        # Update WebSocket on new reading data
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "group_glucose_updates",  # This should match the group name in your consumer
            {
                "type": "send_glucose_update",
                "data": {
                    "timestamp": new_reading.timestamp.strftime("%H:%M"),
                    "glucose": float(new_reading.reading),
                    "trend": new_reading.trend or "NODATA",
                    "bolus_injected": float(new_reading.bolus_injected),
                    "basal_injected": float(new_reading.basal_injected),
                },
            },
        )

        # If new record, add it to the profile
        if not existing_reading:
            user.profile.glucose_readings.add(new_reading)

        # Purge readings older than 24 hours
        GlucoseReading.objects.filter(
            timestamp__lt=current_time - timedelta(hours=24)
        ).delete()

        # Update patient IOB
        user.profile.update_iob()

        # Update user's last update time
        user.profile.last_update_time = current_time
        user.profile.save()

        logger.info(f"{user.profile}\n{new_reading}")

    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found.")
    except Exception as e:
        logger.error(f"Error processing user {user_id}: {e}")

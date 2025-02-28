from datetime import datetime
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from api.models import GlucoseReading
from simglucose.simulation.env import T1DSimEnv
from simglucose.patient.t1dpatient import T1DPatient
from simglucose.sensor.cgm import CGMSensor
from simglucose.actuator.pump import InsulinPump
from simglucose.simulation.scenario_gen import RandomScenario
from simglucose.controller.base import Action
from decimal import Decimal, getcontext
from celery import shared_task
from django.contrib.sessions.models import Session
from django.utils.timezone import now
import logging

# Constants
getcontext().prec = 3
logger = logging.getLogger(__name__)
User = get_user_model()

# Global variable to store if bolus injection as called, and how many carbs specified
_is_bolus_called = False
_carbs_on_board = 0


# Setter functions
def set_bolus_called(value):
    global _is_bolus_called
    _is_bolus_called = value


def set_carbs_on_board(value):
    global _carbs_on_board
    _carbs_on_board = value


# Consilidated global variable setting into one function for simplicity
def call_bolus(carbs_on_board):
    set_bolus_called(True)
    set_carbs_on_board(carbs_on_board)


# Create a reading and apply the necessary insulin
@shared_task
def create_reading(*args):
    try:
        # Get the user from the database
        user_id = args[0]
        user = User.objects.get(id=user_id)

        # Initialize simulation environment
        env = T1DSimEnv(
            patient=T1DPatient.withName(user.profile.diabetic_profile),
            sensor=CGMSensor.withName("Dexcom"),
            pump=InsulinPump.withName("Insulet"),
            scenario=RandomScenario(start_time=datetime.now(), seed=user.id),
        )

        # Check if previous readings exist
        latest_reading = user.profile.readings.last()

        if latest_reading:
            # Use actual past insulin doses if available
            basal_dose = Decimal(latest_reading.basal_injected)
            bolus_dose = Decimal(latest_reading.bolus_injected)
        else:
            # No previous readings - use default values
            basal_dose = Decimal(0)
            bolus_dose = Decimal(0)

        # Run the insulin doses through the simulator
        obs = env.step(Action(basal=basal_dose, bolus=bolus_dose)).observation

        # Create empty GlucoseReading object
        new_reading = GlucoseReading(patient=user)

        # Process glucose reading
        reading = float(obs[0]) / 18  # Convert mg/dL to mmol/L
        new_reading.reading = new_reading.adjust_for_noise(reading)

        trend_rate = new_reading.calculate_trend()
        new_reading.trend = new_reading.detect_trend_alert(trend_rate)

        new_reading.basal_injected = user.profile.titrate_basal()
        new_reading.bolus_injected = (
            user.profile.titrate_bolus(_carbs_on_board) if _is_bolus_called else 0.00
        )

        # Save new reading
        new_reading.save()
        user.profile.readings.add(new_reading)

        # Reset variables
        set_bolus_called(False)
        set_carbs_on_board(0)

        logger.info(
            f"New glucose reading for user {user.id}: {new_reading.reading} mmol/L"
        )

    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} not found.")
    except Exception as e:
        logger.error(f"Error processing user {user_id}: {e}")

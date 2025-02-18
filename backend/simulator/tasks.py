from django.contrib.auth.models import User
import numpy as np
from api.models import GlucoseReading
from simglucose.simulation.env import T1DSimEnv
from simglucose.patient.t1dpatient import T1DPatient
from simglucose.sensor.cgm import CGMSensor
from simglucose.actuator.pump import InsulinPump
from simglucose.simulation.scenario_gen import RandomScenario
from simglucose.controller.base import Action
from decimal import Decimal, getcontext

# Constants
getcontext().prec = 3

# Variables storing injection data
basal_injected = 0.00
bolus_injected = 0.00

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
def generate_reading(user_id):
    # Variables needed for simulation
    user = User.objects.get(id=user_id)
    env = T1DSimEnv(
        patient=T1DPatient.withName(user.profile.diabetic_profile),
        sensor=CGMSensor.withName("Dexcom", seed=user_id),
        pump=InsulinPump.withName("Insulet", seed=user_id),
        scenario=RandomScenario(seed=user_id),
    )

    # Get observation if glucose readings exist
    if user.profile.readings:
        latest_reading = user.profile.readings[-1]
        obs = env.step(
            Action(
                basal=Decimal(latest_reading.basal_injected),
                bolus=Decimal(latest_reading.bolus_injected),
            )
        )
    else:
        obs = env.step(Action(basal=0, bolus=0))

    # Get reading
    reading = obs[0] / 18  # convert to mmol/L

    # Get final reading
    adjusted_read = GlucoseReading.adjust_for_noise(reading)

    # Compute trend
    trend = GlucoseReading.detect_trend_alert()

    # Calculate basal titration
    basal_injected = user.profile.titrate_basal()

    # Calculate bolus titration if bolus was called
    if _is_bolus_called:
        bolus_injected = user.profile.titrate_bolus(_carbs_on_board)
    else:
        bolus_injected = 0.00

    # Update IOB
    user.profile.update_iob()

    # Create new glucose reading object
    GlucoseReading.objects.create(
        patient=user,
        reading=adjusted_read,
        trend=trend,
        basal_injected=basal_injected,
        bolus_injected=bolus_injected,
    )

    # Clear variables
    basal_injected = 0.00
    bolus_injected = 0.00
    set_bolus_called(False)
    set_carbs_on_board(0)

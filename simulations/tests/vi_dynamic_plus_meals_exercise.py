import math
import datetime
import random as rand
import matplotlib
import warnings
from matplotlib import pyplot as plt
from simglucose.simulation.scenario import CustomScenario
from simglucose.controller.base import Controller, Action
from simglucose.simulation.user_interface import simulate
from simglucose.patient.t1dpatient import T1DPatient
from simglucose.simulation.env import T1DSimEnv
from simglucose.sensor.cgm import CGMSensor
from simglucose.actuator.pump import InsulinPump
from algorithms import titrate_basal, titrate_bolus

# Force matplotlib to not open any GUI
matplotlib.use("Agg")
warnings.filterwarnings("ignore", category=UserWarning)

# Basal rates for each patient profile
BASAL_RATES = {
    "adult#001": 0.65,
    "adult#002": 0.35,
    "adult#003": 0.7,
    "adult#004": 0.05,
    "adult#005": 0.45,
}

# Meal schedule (hours since simulation start)
MEAL_TIMES = {
    "breakfast": 8,
    "exercise1": 10,
    "lunch": 12,
    "snack": 15,
    "exercise2": 16,
    "dinner": 18,
}

# Meal carbs (g)
MEAL_CARBS = {
    "breakfast": 20,
    "exercise1": -20,
    "lunch": 45,
    "snack": 10,
    "exercise2": -40,
    "dinner": 30,
}


class MyController(Controller):
    def __init__(self, init_state, patient_id, env):
        self.init_state = init_state
        self.state = init_state
        self.patient_id = patient_id
        self.env = env
        self.basal_rate = BASAL_RATES.get(patient_id, 0.0)
        self.iob = 0.0
        self.last_update_time = None

        # Store full glucose history for the patient
        self.glucose_history = []

        # Store insulin history
        self.bolus_hist = []
        self.basal_hist = []

        # Track meals given
        self.meals = {meal: False for meal in MEAL_TIMES}

    def policy(self, observation, reward, done, **info):
        """Determines basal insulin action based on glucose levels, trends, and IOB."""

        # Store the current glucose reading
        current_glucose = observation.CGM / 18.0  # convert to mmol/L
        self.glucose_history.append(current_glucose)
        self.state = observation  # Set state for simulator

        # Ensure we have enough readings to detect trends
        if len(self.glucose_history) < 3:
            return Action(basal=0, bolus=0)

        # Calculate glucose trend rate
        trend_rate = self.calculate_trend()
        glucose_trend = self.detect_trend_alert(trend_rate)

        # Target glucose levels & correction factors
        glucose_target = 6.1
        glucose_min = 3.9
        correction_factor = 1.2

        # Update insulin on board (IOB)
        self.update_iob()

        # Compute new basal dose using titration algorithm
        basal_dose = titrate_basal(
            current_glucose,
            glucose_trend,
            glucose_target,
            glucose_min,
            correction_factor,
            self.basal_rate,
            self.iob,
            em_enabled=True,
        )
        self.basal_hist.append(basal_dose)

        # Compute bolus for meals
        bolus_dose = self.calculate_meal_bolus()
        if bolus_dose > 0:
            self.bolus_hist.append(bolus_dose)

        return Action(basal=basal_dose, bolus=bolus_dose)

    def calculate_meal_bolus(self):
        """Checks if a meal time is reached and administers a bolus dose."""
        current_hour = datetime.datetime.now().hour

        for meal, meal_hour in MEAL_TIMES.items():
            if meal_hour == current_hour and not self.meals[meal]:
                carbs = MEAL_CARBS[meal]
                bolus_dose = titrate_bolus(
                    carbs,
                    self.glucose_history[-1],
                    glucose_min=3.9,
                    glucose_target=6.1,
                    carb_ratio=10,
                    correction_factor=1.2,
                    bolus_max=25,
                    iob=self.iob,
                    em_enabled=True,
                )
                self.meals[meal] = True  # Mark meal as taken
                return bolus_dose

        # Otherwise return nothing
        return 0.0

    def calculate_trend(self):
        """Calculates glucose trend rate based on the past 15 minutes (3 readings)."""
        past_bg = self.glucose_history[-3]
        current_bg = self.glucose_history[-1]

        return (current_bg - past_bg) / 3.0

    def detect_trend_alert(self, trend_rate):
        """Assigns a trend arrow based on glucose changes per minute."""
        if abs(trend_rate) < 0.0555:
            return "→"
        elif 0.0555 <= abs(trend_rate) < 0.111:
            return "↗" if trend_rate > 0 else "↘"
        elif 0.111 <= abs(trend_rate) < 0.1665:
            return "↑" if trend_rate > 0 else "↓"
        else:
            return "↑↑" if trend_rate > 0 else "↓↓"

    def update_iob(self):
        """Updates insulin on board by decaying previous insulin and adding new doses."""
        current_time = datetime.datetime.now()
        if self.last_update_time is None:
            self.last_update_time = current_time

        elapsed_time = (current_time - self.last_update_time).total_seconds() / 60.0
        self.last_update_time = current_time

        # Decay existing IOB
        if self.iob > 0:
            try:
                decay_factor = math.exp(-elapsed_time / 180.0)
                self.iob = round(self.iob * decay_factor, 2)
            except ValueError as e:
                print(f"IOB decay calculation failed: {e}")

        # Process past insulin doses
        new_bolus = sum(self.bolus_hist[-10:]) if self.bolus_hist else 0.0
        new_basal = sum(self.basal_hist[-10:]) if self.basal_hist else 0.0

        self.iob += new_bolus

        if new_basal > 0:
            try:
                basal_integral = new_basal * (1.0 - math.exp(-elapsed_time / 180.0))
                self.iob += basal_integral
            except ValueError as e:
                print(f"Basal integral calculation failed: {e}")

    def reset(self):
        self.state = self.init_state
        self.iob = 0.0
        self.last_update_time = None
        self.glucose_history = []  # Clear history on reset
        self.bolus_hist = []
        self.basal_hist = []
        self.meals = {meal: False for meal in MEAL_TIMES}


def run_dynamic_basal_plus_meals_exercise(patient_id, save_path):
    """Runs a single instance of the simulation for a given patient."""
    scenario = CustomScenario(
        start_time=datetime.datetime.now(),
        scenario=[(MEAL_TIMES[meal], MEAL_CARBS[meal]) for meal in MEAL_TIMES],
    )

    # Create a patient object from patient_id
    patient = T1DPatient.withName(patient_id)

    sensor = CGMSensor.withName("Dexcom")
    pump = InsulinPump.withName("Insulet")

    # Create the simulation environment
    env = T1DSimEnv(patient=patient, sensor=sensor, pump=pump, scenario=scenario)

    # Initialize the controller with the correct patient object
    controller = MyController(0, patient_id, env)

    # Unique CGM seed per simulation
    cgm_seed = rand.randint(0, 999999)

    simulate(
        sim_time=datetime.timedelta(hours=24),
        scenario=scenario,
        controller=controller,
        patient_names=[patient_id],
        cgm_name="Dexcom",
        cgm_seed=cgm_seed,
        insulin_pump_name="Insulet",
        start_time=datetime.datetime.now(),
        save_path=save_path,
        animate=False,
        parallel=False,
    )

    # Clean up figures to avoid memory leaks
    plt.close("all")

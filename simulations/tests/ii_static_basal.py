from decimal import Decimal, getcontext
from matplotlib import pyplot as plt
from simglucose.simulation.scenario import CustomScenario
from simglucose.controller.base import Controller, Action
from simglucose.simulation.user_interface import simulate
import datetime
import random as rand
import matplotlib
import warnings

# Force matplotlib to not open any GUIs (which simglucose does automatically)
matplotlib.use("Agg")
warnings.filterwarnings("ignore", category=UserWarning)

# Decimal precision
getcontext().prec = 3

# Basal rates for each patient profile
BASAL_RATES = {
    "adult#001": 0.65,
    "adult#002": 0.35,
    "adult#003": 0.7,
    "adult#004": 0.05,
    "adult#005": 0.45,
}


class MyController(Controller):
    def __init__(self, init_state, patient_id):
        self.init_state = init_state
        self.state = init_state
        self.patient_id = patient_id
        self.basal_rate = BASAL_RATES.get(patient_id, Decimal("0.0"))

    def policy(self, observation, reward, done, **info):
        self.state = observation
        return Action(basal=self.basal_rate, bolus=0)

    def reset(self):
        self.state = self.init_state


def run_static_basal(patient_id, save_path):
    """Runs a single instance of the simulation for a given patient."""
    scenario = CustomScenario(start_time=datetime.datetime.now(), scenario=[(0, 0)])
    controller = MyController(0, patient_id)

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
        save_path=f"{save_path}",
        animate=False,
        parallel=False,
    )

    # Clean up figures to avoid memory leaks
    plt.close("all")

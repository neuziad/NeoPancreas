# ================================================================
#         4E 65 6F 50 61 6E 63 72 65 61 73
#  __  _ ___ __  ___  __  __  _  ______ ___  __    __
# |  \| | __/__\| _,\/  \|  \| |/ _/ _ \ __|/  \ /' _/
# | | ' | _| \/ | v_/ /\ | | ' | \_| v / _|| /\ |`._`.
# |_|\__|___\__/|_| |_||_|_|\__|\__/_|_\___|_||_||___/
#
# This module will run specified Simglucose unit tests, or all of with the --all arg.
# Each test will run their respective simulation algorithm for each adult patient profile 1-5,
# in order to demonstrate the efficacy of the algorithms used in NeoPancreas. Each test
# will display how certain aspects of the final algorithm can impact glycaemic control.
#
# TESTS INCLUDE:
# 1. Control - Diabetic patients given no insulin
# 2. Static basal - Diabetic patients given a static rate of basal insulin and nothing else.
# 3. Dynamic basal - Diabetic patients given a constantly changin basal insulin dosage,
#    based on current glucose levels and trends. This will be the basal insulin algorithm
#    that appears in NeoPancreas.
# 4. Dynamic basal + exercise mode - Diabetic patients given a constantly changing basal
#    insulin dosage, as well as "exercise mode" enabled, which lowers the amount of overall
#    insulin administered to the patient to compensate for the increased metabolic demands
#    of exercise. With this simulation, you should notice generally higher blood glucose
#    levels compared to test 3.
# 5. Dynamic basal + bolus for meals - Diabetic patients given a constantly changing basal
#    insulin dosage, as well as 3 boluses throughout the day for breakfast, lunch and dinner.
#    This will demonstrate the efficacy of the bolus algorithm in NeoPancreas for an average
#    yet sedintary diabetic patient.
# 6. Dynamic basal + bolus for meals + exercise mode - Diabetic patients given a constantly
#    changing basal bolus for meals, as well as a snack during exercise, and exercise mode
#    toggled. This will demonstrate how NeoPancreas might work in a more active diabetic patient.
# 7. Lost connection - Diabetic patient given absolutely no insulin in the case of lossy CGM
#    connection, testing as a safety feature. Predictably, this will result in hyperglycaemia,
#    which is mainly an issue in the long term, and is preferable to the more immediately fatal
#    condition of hypoglycaemia, which may occur if CGM connection is lost and the algorithm
#    can't adjust insulin doses appropriately.
#  Miscellaneous tests: Test 3 (dynamic basal rate) simulated on adolescent and child patients
#
# Simglucose generates a variety of files as a result of simulations, of those being evaluated:
# 1. CSV data detailing patient glycaemic data, including: blood glucose (in mg/dL), CGM blood
#    glucose data, carbohydrates on board (g), insulin administered, and risk index for
#    hyper- and hypoglycaemia.
# 2. Line graph visualisations of blood glucose trends from the past 24 hours
# 3. Control Variability Graph Analysis - a 2-dimensional glycaemic control visualisation,
#    which displays the patient's glycaemic control within the 24 hour period. Each
#    grid cell is labelled, with the following terms:
#
#    // A-Zone (accurate control): X = 110–90 mg/dL (6.1–5.0 mmol/L),
#                                  Y = 110–180 mg/dL (6.1–10.0 mmol/L)
#
#    // Lower B (benign deviations into hypoglycaemia): X = 90–70 mg/dL (5.0–3.9 mmol/L),
#                                                       Y = 110–180 mg/dL (6.1–10.0 mmol/L)
#
#    // B (benign control deviations): X = 90–70 mg/dL (5.0–3.9 mmol/L),
#                                      Y = 180–300 mg/dL (10.0–16.7 mmol/L)
#
#    // Upper B (benign deviations into hyperglycaemia): X = 110–90 mg/dL (6.1–5.0 mmol/L),
#                                                        Y = 180–300 mg/dL (10.0–16.7 mmol/L)
#
#    // Lower C (over-correction of hyperglycaemia): X < 70 mg/dL (3.9 mmol/L),
#                                                    Y = 110–180 mg/dL (6.1–10.0 mmol/L)
#
#    // Upper C (over-correction of hypoglycaemia): X = 110–90 mg/dL (6.1–5.0 mmol/L),
#                                                   Y > 300 mg/dL (16.7 mmol/L)
#
#    // Lower D (failure to deal with hypoglycaemia): X < 70 mg/dL (3.9 mmol/L),
#                                                     Y = 180–300 mg/dL (10.0–16.7 mmol/L)
#
#    // Upper D (failure to deal with hyperglycaemia): X = 90–70 mg/dL (5.0–3.9 mmol/L),
#                                                      Y > 300 mg/dL (16.7 mmol/L)
#
#    // E (erroneous control): X < 70 mg/dL (3.9 mmol/L),
#                              Y > 300 mg/dL (16.7 mmol/L)
#
#    (NOTE: This implementation of UVA/PADOVA returns glucose data in mg/dL, as opposed to
#           the British standard, mmol/L. To convert mg/dL to mmol/L, simply divide the
#           reading by 18.)
#
# 4. Risk stats - displays the "risk index" of unbalanced blood glucose, whether high or low.
# 5. Zone stats - displays time in range of blood glucose data
#
# REFERENCES:
# > Simglucose: https://github.com/jxx123/simglucose
# > UVA/PADOVA: https://pmc.ncbi.nlm.nih.gov/articles/PMC4454102
# > Evaluating the Efficacy of Closed-Loop Glucose Regulation via
#     Control-Variability Grid Analysis:
#     https://journals.sagepub.com/doi/epdf/10.1177/193229680800200414
# ================================================================

import os
import multiprocessing
import sys
import argparse
import shutil
from tests.i_control import run_control
from tests.ii_static_basal import run_static_basal
from tests.iii_dynamic_basal import run_dynamic_basal
from tests.iv_dynamic_plus_exercise import run_dynamic_plus_exercise
from tests.v_dynamic_plus_meals import run_dynamic_basal_plus_meals
from tests.vi_dynamic_plus_meals_exercise import run_dynamic_basal_plus_meals_exercise
from tests.vii_lossy_connection import run_lossy_connection

SAVE_PATH = "./results"
PATIENTS = [f"adult#{str(i).zfill(3)}" for i in range(1, 6)]
MISC_PATIENTS = ["child#001", "child#002", "adolescent#001", "adolescent#002"]


def main(start, end):
    if os.path.exists(SAVE_PATH):
        shutil.rmtree(SAVE_PATH)

    os.makedirs(SAVE_PATH, exist_ok=True)

    # Validate user input
    if start < 1 or end > 7 or start > end:
        print("Invalid input! Please try again.", file=sys.stderr)
        return

    # Run simulations in parallel
    with multiprocessing.Pool(
        processes=min(len(PATIENTS), multiprocessing.cpu_count())
    ) as pool:
        try:
            for i in range(start, end + 1):
                if i == 1:
                    pool.starmap(
                        run_control,
                        [
                            (patient, f"{SAVE_PATH}/1control_{patient}")
                            for patient in PATIENTS
                        ],
                    )
                elif i == 2:
                    pool.starmap(
                        run_static_basal,
                        [
                            (patient, f"{SAVE_PATH}/2static_basal_{patient}")
                            for patient in PATIENTS
                        ],
                    )
                elif i == 3:
                    pool.starmap(
                        run_dynamic_basal,
                        [
                            (patient, f"{SAVE_PATH}/3dynamic_basal_{patient}")
                            for patient in PATIENTS
                        ],
                    )
                elif i == 4:
                    pool.starmap(
                        run_dynamic_plus_exercise,
                        [
                            (patient, f"{SAVE_PATH}/4dynamic_plus_exercise_{patient}")
                            for patient in PATIENTS
                        ],
                    )
                elif i == 5:
                    pool.starmap(
                        run_dynamic_basal_plus_meals,
                        [
                            (
                                patient,
                                f"{SAVE_PATH}/5dynamic_basal_plus_meals_{patient}",
                            )
                            for patient in PATIENTS
                        ],
                    )
                elif i == 6:
                    pool.starmap(
                        run_dynamic_basal_plus_meals_exercise,
                        [
                            (
                                patient,
                                f"{SAVE_PATH}/6dynamic_basal_plus_meals_exercise_{patient}",
                            )
                            for patient in PATIENTS
                        ],
                    )
                elif i == 7:
                    pool.starmap(
                        run_lossy_connection,
                        [
                            (patient, f"{SAVE_PATH}/7lossy_connection_{patient}")
                            for patient in PATIENTS
                        ],
                    )
            print("Selected simulations completed successfully.")
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)

def main_misc():
    for patient in MISC_PATIENTS:
        run_dynamic_basal(patient, f"{SAVE_PATH}/misc_{patient}")
    
    print("Miscellaneous tests completed successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--all", action="store_true", help="Run all simulations at once"
    )
    parser.add_argument(
        "--misc", action="store_true", help="Run miscellaneous tests"
    )
    args = parser.parse_args()

    try:
        if args.all:
            main(1, 7)
        elif args.misc:
            main_misc()
        else:
            start = int(input("Enter the starting test number (1-7): ") or 1)
            end = int(input("Enter the ending test number (1-7): ") or 7)
            main(start, end)
    except KeyboardInterrupt:
        print("\nExiting simulation test interface...")
        sys.exit(0)

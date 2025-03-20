EXERCISE_MODE_MODIFIER = 0.25  # Float value for exercise mode modifier


def titrate_basal(
    current_glucose,
    glucose_trend,
    glucose_target,
    glucose_min,
    correction_factor,
    basal_rate,
    iob,
    em_enabled,
):
    """
    Adjusts basal insulin delivery based on glucose levels, trends, and IOB.

    Args:
    - current_glucose: Current glucose level (mmol/L)
    - glucose_trend: Trend arrow as string (e.g., "↑", "→", "↓")
    - glucose_target: Target glucose level (mmol/L)
    - glucose_min: Minimum safe glucose level
    - correction_factor: How much 1U of insulin lowers glucose (mmol/L)
    - basal_rate: Default basal insulin rate per hour
    - iob: Insulin on board
    - em_enabled: Exercise mode toggle

    Returns:
    - Adjusted basal insulin dose for next step (U)
    """

    # If IOB is already sufficient or glucose is too low, stop basal delivery
    if iob > basal_rate or current_glucose < glucose_min:
        return 0.0

    # Convert basal rate to per-step insulin dose
    basal_per_step = basal_rate / 12.0

    # Correction dose
    correction_dose = (current_glucose - glucose_target) / correction_factor / 12.0
    basal_per_step += correction_dose

    # Trend adjustment
    trend_multipliers = {
        "↑↑": 1,
        "↑": 0.80,
        "↗": 0.55,
        "→": 0.35,
        "↘": 0.05,
        "↓": 0.0,
        "↓↓": 0.0,
        "NODATA": 0.0,
    }
    basal_per_step *= trend_multipliers.get(glucose_trend, 1.0)

    # Apply exercise mode modifier
    if em_enabled:
        basal_per_step *= EXERCISE_MODE_MODIFIER

    # Ensure no negative insulin delivery
    basal_per_step = max(0.0, basal_per_step)

    # Round to nearest 0.05 for pump precision
    basal_per_step = round(basal_per_step / 0.05) * 0.05

    return basal_per_step


def titrate_bolus(
    carbs,
    current_glucose,
    glucose_min,
    glucose_target,
    carb_ratio,
    correction_factor,
    bolus_max,
    iob=0.0,
    em_enabled=False,
):
    """
    Adjusts bolus insulin delivery based on glucose levels, IOB, and carb input.

    Parameters:
    - carbs (float): Amount of carbohydrates consumed (grams)
    - current_glucose (float): Current blood glucose level (mmol/L)
    - glucose_min (float): Minimum glucose threshold before withholding bolus
    - glucose_target (float): Target blood glucose level
    - carb_ratio (float): Insulin-to-carb ratio (g/U)
    - correction_factor (float): Correction factor (how much 1U lowers glucose)
    - bolus_max (float): Maximum allowable bolus dose
    - iob (float, optional): Insulin on board (default: 0)
    - em_enabled (bool, optional): Whether exercise mode is enabled

    Returns:
    - float: Adjusted bolus dose (U), rounded to nearest 0.05U
    """

    # If glucose is below the minimum threshold, no bolus should be given
    if current_glucose < glucose_min:
        return 0.0

    # Compute the carb-based bolus
    bolus_dose = carbs / carb_ratio

    # Add correction bolus for high glucose
    bolus_dose += (current_glucose - glucose_target) / correction_factor

    # Apply exercise mode reduction
    if em_enabled:
        bolus_dose *= EXERCISE_MODE_MODIFIER

    # Constrain bolus within allowed limits
    bolus_dose = min(max(0.0, bolus_dose), bolus_max)

    # Round to nearest 0.05U for precision
    return round(bolus_dose / 0.05) * 0.05

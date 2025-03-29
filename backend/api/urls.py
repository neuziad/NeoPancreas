from django.urls import path
from api.views import (
    GlucoseReadingList,
    SensorSettingsView,
    PumpSettingsView,
    UserProfileView,
    start_simulation,
    stop_simulation,
    simulation_status,
    toggle_exercise_mode,
    UserView,
    inject_bolus,
)

urlpatterns = [
    path("start-simulation/", start_simulation, name="start_simulation"),
    path("stop-simulation/", stop_simulation, name="stop_simulation"),
    path(
        "simulation-status/", simulation_status, name="simulation_status"
    ),
    path(
        "glucose-readings/", GlucoseReadingList.as_view(), name="glucose-readings-list"
    ),
    path("user-profile/", UserProfileView.as_view(), name="user-profile"),
    path("user/", UserView.as_view(), name="user"),
    path("toggle-em/", toggle_exercise_mode, name="toggle_exercise_mode"),
    path("sensor-settings/", SensorSettingsView.as_view(), name="sensor-settings"),
    path("pump-settings/", PumpSettingsView.as_view(), name="pump-settings"),
    path("inject-bolus/", inject_bolus, name="inject_bolus"),
]

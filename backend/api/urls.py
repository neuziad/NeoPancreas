from django.urls import path
from api.views import (
    start_simulation,
    stop_simulation,
    simulation_status,
)

urlpatterns = [
    path("start-simulation/<int:user_id>/", start_simulation, name="start_simulation"),
    path("stop-simulation/<int:user_id>/", stop_simulation, name="stop_simulation"),
    path(
        "simulation-status/<int:user_id>/", simulation_status, name="simulation_status"
    ),
]

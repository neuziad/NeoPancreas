from django.urls import path
from . import views

urlpatterns = [
    path("glucose/", views.GlucoseListCreate.as_view(), name="glucose-list"),
    path("start-simulation/", views.start_simulation, name="start_simulation"),
    path("stop-simulation/", views.stop_simulation, name="stop_simulation"),
    path("simulation-status/", views.simulation_status, name="simulation_status"),
]

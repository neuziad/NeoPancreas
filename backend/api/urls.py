from django.urls import path
from . import views

urlpatterns = [
    path("glucose/", views.GlucoseListCreate.as_view(), name="glucose-list"),
]

from django.urls import path
from .consumers import GlucoseConsumer

websocket_urlpatterns = [
    path("ws/glucose/", GlucoseConsumer.as_asgi()),
]

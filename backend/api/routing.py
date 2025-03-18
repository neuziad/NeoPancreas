from django.urls import re_path
from .consumers import GlucoseConsumer

websocket_urlpatterns = [
    re_path(r"ws/glucose/$", GlucoseConsumer.as_asgi()),
]

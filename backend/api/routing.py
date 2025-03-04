from django.urls import re_path
from .consumers import GlucoseReadingConsumer
from channels.routing import ProtocolTypeRouter, URLRouter
from api.middleware import JWTAuthMiddleware

websocket_urlpatterns = [
    re_path(r"ws/glucose/$", GlucoseReadingConsumer.as_asgi()),
]

application = ProtocolTypeRouter(
    {
        "websocket": JWTAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
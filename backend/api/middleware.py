from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from django.apps import apps

User = get_user_model()

class JWTAuthMiddleware:
    """Custom WebSocket middleware to authenticate users via JWT token."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if not apps.ready:
            raise RuntimeError("Django apps not ready yet.")
        
        query_string = parse_qs(scope["query_string"].decode())

        # Extract token from WebSocket query parameters
        token = query_string.get("access", [None])[0]
        scope["user"] = AnonymousUser()

        if token:
            try:
                decoded_token = AccessToken(token)
                scope["user"] = await self.get_user(decoded_token["user_id"])
            except Exception as e:
                print(f"JWT Authentication Failed: {e}")

        return await self.inner(scope, receive, send)

    @database_sync_to_async
    def get_user(self, user_id):
        """Fetch user from database using the decoded user_id."""
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return AnonymousUser()

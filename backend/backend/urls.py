from django.contrib import admin
from django.urls import path, include
from api.views import RegisterUserView

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/user/register/", RegisterUserView.as_view(), name="register"),
    path("api/token/", TokenObtainPairView.as_view(), name="token_get"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api-auth/", include("rest_framework.urls")),
    path("api/", include("api.urls")),
]

from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import (
    SensorSettingsSerializer,
    UserProfileSerializer,
    UserSerializer,
    PumpSettingsSerializer,
)
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import GlucoseReading, UserProfile
from django_celery_beat.models import PeriodicTask, CrontabSchedule
from django.http import JsonResponse
import json
from rest_framework.decorators import api_view
import logging
from django.utils.timezone import now, timedelta
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from rest_framework_simplejwt.authentication import JWTAuthentication

logger = logging.getLogger(__name__)


class GlucoseReadingList(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        """Fetch glucose readings for the authenticated user."""
        logger.info("Headers received:", request.headers)
        user = request.user  # Get the authenticated user from JWT token

        # Retrieve time range from query parameters (default to 4 hours)
        timespan = request.query_params.get("timespan", 4)

        try:
            timespan = int(timespan)
        except ValueError:
            return Response(
                {"error": "Invalid timespan"}, status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate start time
        start_time = now() - timedelta(hours=timespan)

        # Filter readings for the authenticated user only
        readings = GlucoseReading.objects.filter(
            patient=user.profile, timestamp__gte=start_time
        ).order_by("timestamp")

        # Serialize and return the data
        data = [
            {
                "timestamp": r.timestamp.strftime("%H:%M"),
                "glucose": r.reading,
                "trend": r.trend or "NODATA",
                "bolus_injected": r.bolus_injected or 0,
                "basal_injected": r.basal_injected or 0,
            }
            for r in readings
        ]

        return Response(data, status=status.HTTP_200_OK)


class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retrieve the authenticated user's profile data"""
        try:
            user = request.user
            user_profile = UserProfile.objects.get(user=user)

            # Ensure the serializer returns all fields
            serializer = UserProfileSerializer(user_profile)

            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response(
                {"error": "User profile not found"}, status=status.HTTP_404_NOT_FOUND
            )


class UserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            """Retrieve the authenticated user's data"""
            return Response(UserSerializer(request.user).data)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found"}, status=status.HTTP_404_NOT_FOUND
            )


class RegisterUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class SensorSettingsView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SensorSettingsSerializer
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user.profile

    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


class PumpSettingsView(generics.UpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PumpSettingsSerializer
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user.profile

    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)


@api_view(["POST"])
def start_simulation(request):
    """
    Begins the glucose simulation for the authenticated user.
    """
    user = request.user

    task_name = f"user-reading-task-{user.id}"

    # Check if the periodic task already exists
    if PeriodicTask.objects.filter(name=task_name).exists():
        return JsonResponse({"message": "Simulation already running."}, status=400)

    # This schedule will trigger at minutes 0,5,10,15,... on every hour
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute="*/5",
        hour="*",
        day_of_week="*",
        day_of_month="*",
        month_of_year="*",
    )

    # Create the periodic task
    PeriodicTask.objects.create(
        crontab=schedule,
        name=task_name,
        task="simulator.tasks.create_reading",
        args=json.dumps([user.id]),  # Pass user_id correctly to Celery task
    )

    return JsonResponse(
        {"message": f"Simulation started for user {user.id}"}, status=200
    )


@api_view(["POST"])
def stop_simulation(request):
    """
    Stops the glucose simulation for the authenticated user.
    """
    user = request.user

    task_name = f"user-reading-task-{user.id}"

    # Remove the user's periodic task
    deleted, _ = PeriodicTask.objects.filter(name=task_name).delete()

    if deleted:
        return JsonResponse({"message": "Simulation stopped"}, status=200)

    return JsonResponse({"message": "No simulation found"}, status=400)


@api_view(["GET"])
def simulation_status(request):
    """
    Checks if the glucose simulation is currently running for the authenticated user.
    """
    user = request.user

    task_name = f"user-reading-task-{user.id}"

    is_running = PeriodicTask.objects.filter(name=task_name).exists()
    return JsonResponse({"running": is_running})


@api_view(["GET"])
def toggle_exercise_mode(request):
    user = request.user
    user.profile.em_enabled = not user.profile.em_enabled
    user.profile.save()
    return JsonResponse({"success": True})


@api_view(["POST"])
def inject_bolus(request):
    """API endpoint to store pending bolus for the next scheduled reading."""
    user = request.user.profile
    bolus_dose = request.data.get("bolus", 0)  # Get bolus from frontend

    try:
        # Store the bolus in the profile for the next scheduled reading
        user.pending_bolus = bolus_dose
        user.save()

        return Response({"message": "Bolus recorded successfully!"}, status=200)
    except Exception as e:
        logger.error(f"Error storing bolus: {e}")
        return Response({"error": "Failed to record bolus."}, status=500)

from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserProfileSerializer, UserSerializer
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
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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


class RegisterUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


@api_view(["POST"])
def start_simulation(request, user_id):
    """
    Begins the glucose simulation for the authenticated user.
    """
    # Get authenticated user from token
    user_from_token = request.user

    # Ensure the user ID in the URL matches the authenticated user
    if user_from_token.id != user_id:
        return JsonResponse({"message": "Invalid user ID"}, status=403)

    task_name = f"user-reading-task-{user_id}"

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
        args=json.dumps([user_id]),  # Pass user_id correctly to Celery task
    )

    return JsonResponse(
        {"message": f"Simulation started for user {user_id}"}, status=200
    )


@api_view(["POST"])
def stop_simulation(request, user_id):
    """
    Stops the glucose simulation for the authenticated user.
    """
    # Verify user authentication
    user = None
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"message": "Invalid user ID"}, status=401)

    if not request.user.is_authenticated or request.user.id != user.id:
        return JsonResponse({"message": "Invalid user ID"}, status=401)

    task_name = f"user-reading-task-{user.id}"

    # Remove the user's periodic task
    deleted, _ = PeriodicTask.objects.filter(name=task_name).delete()

    if deleted:
        return JsonResponse({"message": "Simulation stopped"}, status=200)

    return JsonResponse({"message": "No simulation found"}, status=400)


@api_view(["GET"])
def simulation_status(request, user_id):
    """
    Checks if the glucose simulation is currently running for the authenticated user.
    """
    # Verify user authentication
    user = None
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"message": "Invalid user ID"}, status=401)

    if not request.user.is_authenticated or request.user.id != user.id:
        return JsonResponse({"message": "Invalid user ID"}, status=401)

    task_name = f"user-reading-task-{user.id}"

    is_running = PeriodicTask.objects.filter(name=task_name).exists()
    return JsonResponse({"running": is_running})


@api_view(["GET"])
def get_glucose_readings(request):
    """Fetch glucose readings for the logged-in user within a time range"""
    user = request.user
    timespan = int(request.GET.get("timespan", 4))
    start_time = now() - timedelta(hours=timespan)

    # Retrieve readings from the database, including trend and insulin data
    readings = GlucoseReading.objects.filter(
        user=user, timestamp__gte=start_time
    ).order_by("timestamp")

    # Format the data to include trend, bolus, and basal data
    data = [
        {
            "timestamp": r.timestamp.strftime("%H:%M"),
            "glucose": r.value,
            "trend": r.trend,
            "bolus_injected": r.bolus_injected or 0,
            "basal_injected": r.basal_injected or 0,
        }
        for r in readings
    ]

    return Response(data)

@api_view(["GET"])
def toggle_exercise_mode(request):
    user = request.user
    user.profile.em_enabled = not user.profile.em_enabled
    user.profile.save()
    return JsonResponse({"success": True})

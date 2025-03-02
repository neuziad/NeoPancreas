from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, GlucoseSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import GlucoseReading
from django_celery_beat.models import PeriodicTask, IntervalSchedule
from django.http import JsonResponse
import json
from rest_framework.decorators import api_view
import logging

logger = logging.getLogger(__name__)


class GlucoseListCreate(generics.ListCreateAPIView):
    serializer_class = GlucoseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return GlucoseReading.objects.filter(author=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(patient=self.request.user)
        else:
            print(serializer.errors)


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
        logger.warning(
            f"User ID mismatch: Token user {user_from_token.id} vs URL user {user_id}"
        )
        return JsonResponse({"message": "Invalid user ID"}, status=403)

    task_name = f"user-reading-task-{user_id}"

    # Check if the periodic task already exists
    if PeriodicTask.objects.filter(name=task_name).exists():
        return JsonResponse({"message": "Simulation already running."}, status=400)

    # Create an interval schedule for every 5 minutes
    schedule, _ = IntervalSchedule.objects.get_or_create(
        every=5,
        period=IntervalSchedule.MINUTES,
    )

    # Create the periodic task
    PeriodicTask.objects.create(
        interval=schedule,
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

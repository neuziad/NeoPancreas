from django.shortcuts import render
from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, GlucoseSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import GlucoseReading
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django_celery_beat.models import PeriodicTask, IntervalSchedule


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


@receiver(user_logged_in)
def on_user_login(sender, request, user, **kwargs):
    # Update Celery Beat's schedule to reflect the logged-in user
    schedule, created = IntervalSchedule.objects.get_or_create(
        every=5, period=IntervalSchedule.MINUTES
    )
    
    # Check if there's already a task, otherwise create one
    PeriodicTask.objects.create(
        interval=schedule,
        name=f"Generate reading for {user.username}",
        task="simulator.tasks.generate_reading",
        args=f"[{user.id}]",
    )

@receiver(user_logged_out)
def on_user_logout(sender, request, user, **kwargs):
    # Remove the task when the user logs out
    PeriodicTask.objects.filter(name=f"Generate reading for {user.username}").delete()
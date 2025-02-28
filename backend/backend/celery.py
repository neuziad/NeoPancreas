import os
import logging
from celery import Celery

# Set default Django settings module for Celery
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")

app = Celery("backend")
app.conf.update(broker_connection_retry_on_startup=True)

# Enable logging for Celery
logger = logging.getLogger("celery")
logger.setLevel(logging.DEBUG)

if not logger.hasHandlers():
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
    logger.addHandler(handler)

# Load Celery config from Django settings, using the `CELERY_` namespace
app.config_from_object("django.conf:settings", namespace="CELERY")

# Autodiscover tasks from all installed apps
app.autodiscover_tasks()


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")

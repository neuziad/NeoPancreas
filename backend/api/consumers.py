import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)


class GlucoseConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        """Handle new WebSocket connections."""
        self.room_name = "glucose_updates"
        self.room_group_name = f"group_{self.room_name}"

        # Add the user to the WebSocket group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()
        logger.info("WebSocket connected from consumers module!")

    async def disconnect(self, close_code):
        """Handle disconnection."""
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Handle incoming messages (optional)."""
        data = json.loads(text_data)
        if data.get("action") == "request_latest":
            latest_reading = await self.get_latest_glucose()
            await self.send(text_data=json.dumps(latest_reading))

    async def send_glucose_update(self, event):
        """Send glucose updates to frontend."""
        await self.send(text_data=json.dumps(event["data"]))

    @sync_to_async
    def get_latest_glucose(self):
        """Retrieve the latest glucose reading from DB."""
        from .models import GlucoseReading

        latest_reading = GlucoseReading.objects.order_by("-timestamp").first()
        if latest_reading:
            return {
                "timestamp": latest_reading.timestamp.strftime("%H:%M"),
                "glucose": latest_reading.reading,
                "trend": latest_reading.trend or "NODATA",
                "bolus_injected": latest_reading.bolus_injected or 0,
                "basal_injected": latest_reading.basal_injected or 0,
            }
        return {"error": "No glucose data available"}

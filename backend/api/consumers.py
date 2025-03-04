import json
from channels.generic.websocket import AsyncWebsocketConsumer


class GlucoseReadingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.group_name = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def send_glucose_reading(self, event):
        reading = event.get("reading", {})

        with open("/app/websocket_debug.log", "a") as log_file:
            log_file.write(f"Consumer Sending: {json.dumps(reading, indent=4)}\n")

        await self.send(text_data=json.dumps(event["reading"]))

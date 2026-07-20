import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Poll


class PollResultsConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.poll_id = self.scope['url_route']['kwargs']['poll_id']
        self.group_name = f'poll_results_{self.poll_id}'
        user = self.scope['user']
        if not user.is_authenticated:
            await self.close()
            return
        poll = await self.get_poll()
        if not poll or poll.creator_id != user.id:
            await self.close()
            return
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    @database_sync_to_async
    def get_poll(self):
        try:
            return Poll.objects.get(id=self.poll_id)
        except Poll.DoesNotExist:
            return None

    async def poll_results_update(self, event):
        await self.send_json(event['data'])

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

from apps.notifications.tickets import consume_websocket_ticket


@database_sync_to_async
def get_user_from_ticket(ticket):
    user_id = consume_websocket_ticket(ticket)

    if not user_id:
        return None

    User = get_user_model()

    try:
        return User.objects.get(
            pk=user_id,
            is_active=True,
        )
    except (User.DoesNotExist, ValueError, TypeError):
        return None


class WebSocketTicketAuthMiddleware:

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        query_string = scope.get(
            "query_string",
            b"",
        ).decode("utf-8")

        query_params = parse_qs(query_string)
        tickets = query_params.get("ticket", [])

        user = None

        if len(tickets) == 1:
            user = await get_user_from_ticket(tickets[0])

        updated_scope = dict(scope)
        updated_scope["user"] = user

        return await self.inner(
            updated_scope,
            receive,
            send,
        )
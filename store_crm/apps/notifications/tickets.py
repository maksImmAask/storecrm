import secrets

import redis
from django.conf import settings


TICKET_TTL = 60
TICKET_PREFIX = "websocket_ticket:"


def get_ticket_redis():
    return redis.Redis.from_url(
        (
            f"redis://{settings.REDIS_HOST}:"
            f"{settings.REDIS_PORT}/3"
        ),
        decode_responses=True,
    )


def create_websocket_ticket(user_id):
    ticket = secrets.token_urlsafe(32)

    client = get_ticket_redis()
    client.set(
        f"{TICKET_PREFIX}{ticket}",
        str(user_id),
        ex=TICKET_TTL,
    )

    return ticket


def consume_websocket_ticket(ticket):
    if not ticket:
        return None

    client = get_ticket_redis()

    # GETDEL атомарно получает билет и сразу удаляет его.
    return client.getdel(f"{TICKET_PREFIX}{ticket}")
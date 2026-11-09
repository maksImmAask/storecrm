from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from apps.notifications.tickets import create_websocket_ticket

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()

        except Exception:
            return Response(
                {"detail": "Invalid refresh token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"detail": "Successfully logged out."},
            status=status.HTTP_205_RESET_CONTENT,
        )
class WebSocketTicketView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ticket = create_websocket_ticket(request.user.pk)

        return Response(
            {
                "ticket": ticket,
                "expires_in": 60,
            },
            status=status.HTTP_201_CREATED,
        )
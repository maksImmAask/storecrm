
import { useEffect, useRef, useState } from "react";
import api from "../api/client";

export interface LiveNotification {
  id: number;
  title: string;
  message: string;
  created_at: string;
}

type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

interface TicketResponse {
  ticket: string;
  expires_in: number;
}

export function useNotificationSocket(
  onNotification: (notification: LiveNotification) => void,
) {
  const [status, setStatus] =
    useState<ConnectionStatus>("connecting");

  const callbackRef = useRef(onNotification);

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    let disposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) return;

      setStatus("disconnected");

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, reconnectDelay);

      reconnectDelay = Math.min(reconnectDelay * 2, 15000);
    };

    const connect = async () => {
      if (disposed) return;

      setStatus("connecting");

      try {
        const response = await api.post<TicketResponse>(
          "/auth/ws-ticket/",
        );

        if (disposed) return;

        const ticket = response.data.ticket;

        if (!ticket) {
          throw new Error("WebSocket ticket was not returned");
        }

        const apiUrl = new URL(
          import.meta.env.VITE_API_URL ||
            "http://localhost:8000/api",
        );

        const protocol =
          apiUrl.protocol === "https:" ? "wss:" : "ws:";

        const wsUrl =
          `${protocol}//${apiUrl.host}` +
          `/ws/notifications/?ticket=${encodeURIComponent(ticket)}`;

        const currentSocket = new WebSocket(wsUrl);
        socket = currentSocket;

        currentSocket.onopen = () => {
          if (disposed) {
            currentSocket.close();
            return;
          }

          reconnectDelay = 1000;
          setStatus("connected");
        };

        currentSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (
              data.type === "notification" &&
              typeof data.title === "string" &&
              typeof data.message === "string"
            ) {
              callbackRef.current({
                id: Number(data.id),
                title: data.title,
                message: data.message,
                created_at:
                  data.created_at || new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error(
              "Invalid WebSocket notification:",
              error,
            );
          }
        };

        currentSocket.onerror = () => {
          currentSocket.close();
        };

        currentSocket.onclose = () => {
          if (!disposed) {
            scheduleReconnect();
          }
        };
      } catch (error) {
        if (!disposed) {
          console.error(
            "WebSocket connection failed:",
            error,
          );
          scheduleReconnect();
        }
      }
    };

    void connect();

    return () => {
      disposed = true;

      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
      }

      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    };
  }, []);

  return { status };
}

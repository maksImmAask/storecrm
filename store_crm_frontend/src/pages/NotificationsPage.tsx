
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
  ActionIcon,
  Tooltip,
  Center,
} from "@mantine/core";

import {
  IconBell,
  IconCheck,
  IconChecks,
  IconRefresh,
  IconSearch,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";

import api from "../api/client";
import {
  useNotificationSocket,
  type LiveNotification,
} from "../hooks/useNotificationSocket";

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface PaginatedResponse<T> {
  count?: number;
  results?: T[];
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<
    NotificationItem[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [liveMessage, setLiveMessage] = useState("");

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<
        PaginatedResponse<NotificationItem> | NotificationItem[]
      >("/notifications/");

      const data = response.data;
      const items = Array.isArray(data)
        ? data
        : data.results ?? [];

      setNotifications(items);
    } catch {
      setError(
        "Не удалось загрузить уведомления. Проверьте подключение.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleLiveNotification = useCallback(
    (notification: LiveNotification) => {
      if (!notification.id || !Number.isFinite(notification.id)) {
        void loadNotifications();
        return;
      }

      setNotifications((current) => {
        if (current.some((item) => item.id === notification.id)) {
          return current;
        }

        return [
          {
            ...notification,
            is_read: false,
          },
          ...current,
        ];
      });

      setLiveMessage(notification.title);

      window.setTimeout(() => {
        setLiveMessage("");
      }, 5000);
    },
    [loadNotifications],
  );

  const { status } = useNotificationSocket(
    handleLiveNotification,
  );

  const unreadCount = useMemo(
    () =>
      notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return notifications;

    return notifications.filter((item) =>
      `${item.title} ${item.message}`
        .toLowerCase()
        .includes(query),
    );
  }, [notifications, search]);

  async function markAsRead(id: number) {
    setUpdatingId(id);
    setError("");

    try {
      await api.post(`/notifications/${id}/mark_read/`);

      setNotifications((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, is_read: true }
            : item,
        ),
      );
    } catch {
      setError(
        "Не удалось отметить уведомление прочитанным.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function markAllAsRead() {
    if (unreadCount === 0) return;

    setMarkingAll(true);
    setError("");

    try {
      await api.post("/notifications/mark_all_read/");

      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          is_read: true,
        })),
      );
    } catch {
      setError(
        "Не удалось отметить все уведомления прочитанными.",
      );
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Group gap="xs">
            <IconBell size={25} />

            <Title order={3}>Уведомления</Title>

            {unreadCount > 0 && (
              <Badge color="red" variant="filled">
                {unreadCount}
              </Badge>
            )}
          </Group>

          <Text size="sm" c="dimmed">
            Все сообщения и события вашей учётной записи
          </Text>
        </div>

        <Group>
          <Button
            variant="light"
            leftSection={<IconChecks size={16} />}
            onClick={() => void markAllAsRead()}
            disabled={unreadCount === 0 || loading}
            loading={markingAll}
          >
            Прочитать все
          </Button>

          <Tooltip label="Обновить список">
            <ActionIcon
              size="lg"
              variant="light"
              onClick={() => void loadNotifications()}
              loading={loading}
              aria-label="Обновить"
            >
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Alert
        color={
          status === "connected"
            ? "green"
            : status === "connecting"
              ? "yellow"
              : "red"
        }
        variant="light"
        icon={
          status === "connected"
            ? <IconWifi size={18} />
            : <IconWifiOff size={18} />
        }
      >
        {status === "connected" &&
          "Подключение активно. Новые уведомления приходят автоматически."}

        {status === "connecting" &&
          "Подключаемся к серверу уведомлений..."}

        {status === "disconnected" &&
          "Нет подключения к серверу уведомлений. Повторное подключение выполняется автоматически."}
      </Alert>

      {liveMessage && (
        <Alert
          color="blue"
          icon={<IconBell size={18} />}
          title="Новое уведомление"
          withCloseButton
          onClose={() => setLiveMessage("")}
        >
          {liveMessage}
        </Alert>
      )}

      <Group grow>
        <Card withBorder>
          <Text size="xs" c="dimmed">
            Всего уведомлений
          </Text>
          <Title order={2}>
            {notifications.length}
          </Title>
        </Card>

        <Card withBorder>
          <Text size="xs" c="dimmed">
            Непрочитанные
          </Text>
          <Title
            order={2}
            c={unreadCount > 0 ? "red" : "green"}
          >
            {unreadCount}
          </Title>
        </Card>

        <Card withBorder>
          <Text size="xs" c="dimmed">
            Прочитанные
          </Text>
          <Title order={2} c="green">
            {notifications.length - unreadCount}
          </Title>
        </Card>
      </Group>

      <Card withBorder radius="md" padding="md">
        <TextInput
          placeholder="Поиск по заголовку или сообщению..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) =>
            setSearch(event.currentTarget.value)
          }
          mb="md"
        />

        {error && (
          <Alert
            color="red"
            mb="md"
            title="Ошибка"
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filteredNotifications.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconBell size={36} color="gray" />

              <Text fw={500}>
                {notifications.length === 0
                  ? "Уведомлений пока нет"
                  : "Ничего не найдено"}
              </Text>

              <Text size="sm" c="dimmed">
                Здесь будут отображаться события вашей CRM
              </Text>
            </Stack>
          </Center>
        ) : (
          <ScrollArea>
            <Stack gap="sm">
              {filteredNotifications.map((item) => (
                <Card
                  key={item.id}
                  withBorder
                  radius="md"
                  padding="md"
                  style={{
                    background: item.is_read
                      ? undefined
                      : "var(--mantine-color-blue-0)",
                  }}
                >
                  <Group
                    justify="space-between"
                    align="flex-start"
                  >
                    <Group
                      align="flex-start"
                      gap="sm"
                      style={{ flex: 1 }}
                    >
                      <IconBell
                        size={21}
                        color={
                          item.is_read
                            ? "gray"
                            : "var(--mantine-color-blue-7)"
                        }
                      />

                      <Stack gap={5} style={{ flex: 1 }}>
                        <Group gap="xs">
                          <Text fw={600}>
                            {item.title}
                          </Text>

                          {!item.is_read && (
                            <Badge
                              color="blue"
                              variant="light"
                            >
                              Новое
                            </Badge>
                          )}
                        </Group>

                        <Text size="sm">
                          {item.message}
                        </Text>

                        <Text size="xs" c="dimmed">
                          {formatDate(item.created_at)}
                        </Text>
                      </Stack>
                    </Group>

                    {!item.is_read && (
                      <Tooltip label="Отметить прочитанным">
                        <ActionIcon
                          variant="light"
                          color="green"
                          onClick={() =>
                            void markAsRead(item.id)
                          }
                          loading={updatingId === item.id}
                          disabled={markingAll}
                          aria-label="Отметить прочитанным"
                        >
                          <IconCheck size={18} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        )}
      </Card>
    </Stack>
  );
}

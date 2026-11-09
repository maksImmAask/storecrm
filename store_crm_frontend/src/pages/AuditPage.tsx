
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Code,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconRefresh,
  IconSearch,
  IconEye,
  IconHistory,
} from "@tabler/icons-react";
import api from "../api/client";

interface AuditLog {
  id: number;
  company: number | null;
  company_name: string | null;
  user: number | null;
  user_email: string | null;
  action: string;
  model_name: string;
  object_id: string;
  old_data: Record<string, unknown>;
  new_data: Record<string, unknown>;
  ip_address: string | null;
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
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    "sale.completed": "Продажа завершена",
    "sale_return.completed": "Возврат завершён",
    "stock_receipt.completed": "Приёмка завершена",
    "stock_transfer.completed": "Перемещение завершено",
    "expense.created": "Расход создан",
    "expense.updated": "Расход изменён",
    "expense.deleted": "Расход удалён",
  };

  return labels[action] ?? action;
}

function actionColor(action: string) {
  if (action.endsWith(".completed")) return "green";
  if (action.endsWith(".created")) return "blue";
  if (action.endsWith(".updated")) return "orange";
  if (action.endsWith(".deleted")) return "red";
  return "gray";
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get<
        PaginatedResponse<AuditLog> | AuditLog[]
      >("/audit-logs/");

      const data = response.data;
      const items = Array.isArray(data) ? data : data.results ?? [];

      setLogs(items);
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err
          ? (
              err as {
                response?: {
                  data?: { detail?: string };
                  status?: number;
                };
              }
            ).response?.data?.detail
          : undefined;

      setError(
        message ??
          "Не удалось загрузить журнал действий. Проверьте подключение и права доступа."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return logs;

    return logs.filter((log) =>
      [
        log.action,
        actionLabel(log.action),
        log.model_name,
        log.object_id,
        log.user_email,
        log.company_name,
        log.ip_address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value)
    );
  }, [logs, search]);

  const rows = filteredLogs.map((log) => (
    <Table.Tr key={log.id}>
      <Table.Td>
        <Text size="sm" fw={600}>
          #{log.id}
        </Text>
      </Table.Td>

      <Table.Td>
        <Stack gap={2}>
          <Text size="sm" fw={500}>
            {actionLabel(log.action)}
          </Text>
          <Badge
            color={actionColor(log.action)}
            variant="light"
            w="fit-content"
          >
            {log.action}
          </Badge>
        </Stack>
      </Table.Td>

      <Table.Td>
        <Text size="sm">{log.model_name}</Text>
        <Text size="xs" c="dimmed">
          ID объекта: {log.object_id || "—"}
        </Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm">{log.user_email ?? "Система / удалённый пользователь"}</Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm">{log.company_name ?? "—"}</Text>
      </Table.Td>

      <Table.Td>
        <Text size="sm" style={{ whiteSpace: "nowrap" }}>
          {formatDate(log.created_at)}
        </Text>
      </Table.Td>

      <Table.Td>
        <Tooltip label="Посмотреть подробности">
          <ActionIcon
            variant="light"
            color="blue"
            onClick={() => setSelectedLog(log)}
            aria-label="Посмотреть подробности"
          >
            <IconEye size={17} />
          </ActionIcon>
        </Tooltip>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <div>
            <Group gap="xs">
              <IconHistory size={25} />
              <Title order={3}>Журнал действий</Title>
            </Group>
            <Text size="sm" c="dimmed">
              История операций пользователей в компании
            </Text>
          </div>

          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            onClick={() => void loadLogs()}
            loading={loading}
          >
            Обновить
          </Button>
        </Group>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between" mb="md">
            <div>
              <Text fw={600}>История операций</Text>
              <Text size="xs" c="dimmed">
                Найдено записей: {filteredLogs.length}
                {search.trim() ? ` из ${logs.length}` : ""}
              </Text>
            </div>
            <Badge variant="light" color="blue">
              Только просмотр
            </Badge>
          </Group>

          <TextInput
            placeholder="Поиск по действию, пользователю, объекту..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
            mb="md"
          />

          {error && (
            <Alert color="red" title="Ошибка загрузки" mb="md">
              {error}
            </Alert>
          )}

          {loading ? (
            <Group justify="center" py="xl">
              <Loader />
            </Group>
          ) : filteredLogs.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl">
              {logs.length === 0
                ? "Записей пока нет."
                : "По вашему запросу ничего не найдено."}
            </Text>
          ) : (
            <ScrollArea>
              <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                verticalSpacing="sm"
                miw={950}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Действие</Table.Th>
                    <Table.Th>Объект</Table.Th>
                    <Table.Th>Пользователь</Table.Th>
                    <Table.Th>Компания</Table.Th>
                    <Table.Th>Дата</Table.Th>
                    <Table.Th>Детали</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>{rows}</Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Card>
      </Stack>

      <Modal
        opened={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        title="Подробности действия"
        size="xl"
        centered
      >
        {selectedLog && (
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600}>Запись #{selectedLog.id}</Text>
              <Badge color={actionColor(selectedLog.action)}>
                {selectedLog.action}
              </Badge>
            </Group>

            <Card withBorder>
              <Stack gap="xs">
                <Text size="sm">
                  <b>Действие:</b> {actionLabel(selectedLog.action)}
                </Text>
                <Text size="sm">
                  <b>Объект:</b> {selectedLog.model_name}
                </Text>
                <Text size="sm">
                  <b>ID объекта:</b> {selectedLog.object_id || "—"}
                </Text>
                <Text size="sm">
                  <b>Пользователь:</b>{" "}
                  {selectedLog.user_email ?? "—"}
                </Text>
                <Text size="sm">
                  <b>Компания:</b> {selectedLog.company_name ?? "—"}
                </Text>
                <Text size="sm">
                  <b>IP-адрес:</b> {selectedLog.ip_address ?? "—"}
                </Text>
                <Text size="sm">
                  <b>Дата:</b> {formatDate(selectedLog.created_at)}
                </Text>
              </Stack>
            </Card>

            <div>
              <Text fw={600} mb="xs">
                Данные до операции
              </Text>
              <Code block style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(selectedLog.old_data ?? {}, null, 2)}
              </Code>
            </div>

            <div>
              <Text fw={600} mb="xs">
                Данные после операции
              </Text>
              <Code block style={{ whiteSpace: "pre-wrap" }}>
                {JSON.stringify(selectedLog.new_data ?? {}, null, 2)}
              </Code>
            </div>

            <Button
              variant="light"
              onClick={() => setSelectedLog(null)}
            >
              Закрыть
            </Button>
          </Stack>
        )}
      </Modal>
    </>
  );
}

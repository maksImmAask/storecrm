
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Table,
  Text,
  TextInput,
  Stack,
  Title,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";

export interface EntityColumn {
  key: string;
  label: string;
}

interface EntityListPageProps {
  title: string;
  description: string;
  endpoint: string;
  columns: EntityColumn[];
}

function getCellValue(item: Record<string, unknown>, key: string): unknown {
  return key.split(".").reduce<unknown>((current, part) => {
    if (
      current !== null &&
      typeof current === "object" &&
      part in current
    ) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, item);
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;

    return String(
      objectValue.name ??
      objectValue.title ??
      objectValue.full_name ??
      objectValue.email ??
      JSON.stringify(value)
    );
  }

  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }

  return String(value);
}

function getRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    );
  }

  if (typeof data === "object" && data !== null) {
    const objectData = data as Record<string, unknown>;

    if (Array.isArray(objectData.results)) {
      return getRows(objectData.results);
    }

    if (Array.isArray(objectData.data)) {
      return getRows(objectData.data);
    }
  }

  return [];
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const response = "response" in error
      ? (error as {
          response?: {
            data?: {
              detail?: string;
              message?: string;
            };
          };
        }).response
      : undefined;

    const apiMessage =
      response?.data?.detail ??
      response?.data?.message;

    if (apiMessage) {
      return apiMessage;
    }
  }

  return "Не удалось загрузить данные. Проверьте API и права доступа.";
}

export default function EntityListPage({
  title,
  description,
  endpoint,
  columns,
}: EntityListPageProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(endpoint);
      setRows(getRows(response.data));
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) =>
      columns.some((column) =>
        formatCell(getCellValue(row, column.key))
          .toLowerCase()
          .includes(normalizedSearch)
      )
    );
  }, [rows, search, columns]);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>{title}</Title>
          <Text size="sm" c="dimmed" mt={4}>
            {description}
          </Text>
        </div>

        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={() => void loadData()}
          loading={loading}
        >
          Обновить
        </Button>
      </Group>

      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <Text fw={600}>Список записей</Text>

          <Badge variant="light" size="lg">
            {filteredRows.length}
          </Badge>
        </Group>

        <TextInput
          placeholder="Поиск по таблице..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          mb="md"
        />

        {error && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={18} />}
            title="Не удалось загрузить список"
            mb="md"
          >
            {error}
          </Alert>
        )}

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
            <Text size="sm" c="dimmed">
              Загружаем данные...
            </Text>
          </Group>
        ) : (
          <ScrollArea>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              miw={650}
            >
              <Table.Thead>
                <Table.Tr>
                  {columns.map((column) => (
                    <Table.Th key={column.key}>
                      {column.label}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredRows.map((row, index) => (
                  <Table.Tr
                    key={String(row.id ?? row.uuid ?? index)}
                  >
                    {columns.map((column) => (
                      <Table.Td key={column.key}>
                        {formatCell(
                          getCellValue(row, column.key)
                        )}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}

                {filteredRows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={columns.length}>
                      <Text c="dimmed" ta="center" py="lg">
                        {search
                          ? "Ничего не найдено."
                          : "Записей пока нет."}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Group justify="space-between" mt="md">
          <Text size="xs" c="dimmed">
            Всего записей: {rows.length}
          </Text>

          <Text size="xs" c="dimmed">
            Показано: {filteredRows.length}
          </Text>
        </Group>
      </Card>
    </Stack>
  );
}

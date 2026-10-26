
import { useCallback, useEffect, useMemo, useState } from "react";
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
  Title,
} from "@mantine/core";
import { IconRefresh, IconSearch } from "@tabler/icons-react";
import api from "../api/client";

interface ApiDataPageProps {
  title: string;
  description: string;
  endpoint: string;
}

type DataRow = Record<string, unknown> & {
  id?: number | string;
};

function getRows(data: unknown): DataRow[] {
  if (Array.isArray(data)) return data as DataRow[];

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    for (const key of ["results", "data", "items"]) {
      if (Array.isArray(object[key])) {
        return object[key] as DataRow[];
      }
    }
  }

  return [];
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if ("full_name" in obj) return String(obj.full_name);
    if ("name" in obj) return String(obj.name);
    if ("email" in obj) return String(obj.email);
    if ("id" in obj) return String(obj.id);

    return JSON.stringify(value);
  }

  return String(value);
}

function humanize(key: string): string {
  const labels: Record<string, string> = {
    id: "ID",
    number: "Номер",
    code: "Код",
    customer: "Клиент",
    customer_name: "Клиент",
    supplier: "Поставщик",
    product: "Товар",
    warehouse: "Склад",
    branch: "Филиал",
    total: "Сумма",
    total_amount: "Общая сумма",
    amount: "Сумма",
    paid_amount: "Оплачено",
    remaining_amount: "Остаток",
    debt_amount: "Долг",
    status: "Статус",
    payment_method: "Способ оплаты",
    payment_type: "Тип оплаты",
    created_at: "Создано",
    updated_at: "Обновлено",
    completed_at: "Завершено",
    due_date: "Срок оплаты",
    date: "Дата",
    quantity: "Количество",
    price: "Цена",
    discount: "Скидка",
    notes: "Комментарий",
  };

  if (labels[key]) return labels[key];

  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isStatusKey(key: string): boolean {
  return ["status", "payment_status", "state"].includes(key);
}

export default function ApiDataPage({
  title,
  description,
  endpoint,
}: ApiDataPageProps) {
  const [rows, setRows] = useState<DataRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(endpoint);
      setRows(getRows(response.data));
    } catch (e) {
      const errorObject = e as {
        response?: { data?: unknown };
        message?: string;
      };

      const data = errorObject.response?.data;

      setError(
        typeof data === "string"
          ? data
          : data
            ? JSON.stringify(data)
            : errorObject.message || "Не удалось загрузить данные",
      );
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns = useMemo(() => {
    const keys = new Set<string>();

    rows.forEach((row) => {
      Object.keys(row).forEach((key) => keys.add(key));
    });

    const preferredOrder = [
      "id",
      "number",
      "code",
      "customer",
      "customer_name",
      "supplier",
      "total",
      "total_amount",
      "paid_amount",
      "remaining_amount",
      "debt_amount",
      "status",
      "payment_method",
      "created_at",
      "date",
    ];

    return [...keys].sort((a, b) => {
      const ai = preferredOrder.indexOf(a);
      const bi = preferredOrder.indexOf(b);

      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;

      return ai - bi;
    });
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    return rows.filter((row) =>
      Object.values(row).some((value) =>
        displayValue(value).toLowerCase().includes(query),
      ),
    );
  }, [rows, search]);

  return (
    <div>
      <Group justify="space-between" align="flex-start" mb="lg">
        <div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed" size="sm" mt={4}>
            {description}
          </Text>
        </div>

        <Button
          variant="default"
          leftSection={<IconRefresh size={16} />}
          onClick={() => void load()}
        >
          Обновить
        </Button>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка загрузки" mb="md">
          {error}
        </Alert>
      )}

      <Card withBorder radius="md" padding="md">
        <TextInput
          mb="md"
          placeholder="Поиск по таблице..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : rows.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            Данные отсутствуют или API вернул пустой список.
          </Text>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover miw={800}>
              <Table.Thead>
                <Table.Tr>
                  {columns.map((column) => (
                    <Table.Th key={column}>{humanize(column)}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredRows.map((row, index) => (
                  <Table.Tr key={row.id ?? index}>
                    {columns.map((column) => {
                      const value = row[column];

                      return (
                        <Table.Td key={column}>
                          {isStatusKey(column) ? (
                            <Badge variant="light">
                              {displayValue(value)}
                            </Badge>
                          ) : (
                            <Text size="sm" lineClamp={2}>
                              {displayValue(value)}
                            </Text>
                          )}
                        </Table.Td>
                      );
                    })}
                  </Table.Tr>
                ))}

                {filteredRows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={Math.max(columns.length, 1)}>
                      <Text ta="center" c="dimmed" py="lg">
                        Ничего не найдено.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Text c="dimmed" size="sm" mt="md">
          Записей: {filteredRows.length}
        </Text>
      </Card>
    </div>
  );
}

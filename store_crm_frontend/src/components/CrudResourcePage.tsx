
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
} from "@mantine/core";
import {
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "../api/client";

export interface CrudField {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
}

interface CrudResourcePageProps {
  title: string;
  description: string;
  endpoint: string;
  fields: CrudField[];
  searchFields?: string[];
}

type RecordData = Record<string, unknown> & {
  id: number | string;
};

function getErrorMessage(error: unknown): string {
  const e = error as {
    response?: {
      data?: Record<string, unknown> | string;
    };
    message?: string;
  };

  const data = e.response?.data;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    return Object.entries(data)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "string"
            ? value
            : JSON.stringify(value);

        return `${key}: ${message}`;
      })
      .join(" | ");
  }

  return e.message || "Произошла неизвестная ошибка";
}

function getRows(data: unknown): RecordData[] {
  if (Array.isArray(data)) return data as RecordData[];

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    if (Array.isArray(object.results)) {
      return object.results as RecordData[];
    }

    if (Array.isArray(object.data)) {
      return object.data as RecordData[];
    }

    if (Array.isArray(object.items)) {
      return object.items as RecordData[];
    }
  }

  return [];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;

    if ("name" in object) return String(object.name);
    if ("full_name" in object) return String(object.full_name);
    if ("id" in object) return String(object.id);

    return JSON.stringify(value);
  }

  return String(value);
}

export default function CrudResourcePage({
  title,
  description,
  endpoint,
  fields,
  searchFields,
}: CrudResourcePageProps) {
  const [rows, setRows] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get(endpoint);
      setRows(getRows(response.data));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return rows;

    const keys =
      searchFields?.length
        ? searchFields
        : fields.map((field) => field.name);

    return rows.filter((row) =>
      keys.some((key) =>
        formatValue(row[key]).toLowerCase().includes(query),
      ),
    );
  }, [rows, search, searchFields, fields]);

  function openCreate() {
    setEditing(null);

    const emptyForm: Record<string, string> = {};

    fields.forEach((field) => {
      emptyForm[field.name] = "";
    });

    setForm(emptyForm);
    setError("");
    setModalOpened(true);
  }

  function openEdit(row: RecordData) {
    setEditing(row);

    const values: Record<string, string> = {};

    fields.forEach((field) => {
      const value = row[field.name];
      values[field.name] =
        value === null || value === undefined ? "" : String(value);
    });

    setForm(values);
    setError("");
    setModalOpened(true);
  }

  async function handleSubmit() {
    for (const field of fields) {
      if (field.required && !form[field.name]?.trim()) {
        setError(`Поле «${field.label}» обязательно для заполнения.`);
        return;
      }
    }

    setSaving(true);
    setError("");

    const payload: Record<string, string> = {};

    fields.forEach((field) => {
      payload[field.name] = form[field.name]?.trim() || "";
    });

    try {
      if (editing) {
        await api.patch(`${endpoint}${editing.id}/`, payload);
      } else {
        await api.post(endpoint, payload);
      }

      setModalOpened(false);
      await loadRows();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: RecordData) {
    const label = formatValue(row.name ?? row.full_name ?? row.id);

    if (!window.confirm(`Удалить запись «${label}»?`)) return;

    setError("");

    try {
      await api.delete(`${endpoint}${row.id}/`);
      await loadRows();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>{title}</Title>
          <Text c="dimmed" size="sm" mt={4}>
            {description}
          </Text>
        </div>

        <Group>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void loadRows()}
          >
            Обновить
          </Button>

          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            Добавить
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка" withCloseButton onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Card withBorder radius="md" padding="md">
        <TextInput
          placeholder="Поиск..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          mb="md"
        />

        {loading ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover miw={750}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  {fields.map((field) => (
                    <Table.Th key={field.name}>{field.label}</Table.Th>
                  ))}
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredRows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.id}</Table.Td>

                    {fields.map((field) => (
                      <Table.Td key={field.name}>
                        {formatValue(row[field.name])}
                      </Table.Td>
                    ))}

                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Button
                          variant="light"
                          color="blue"
                          size="xs"
                          onClick={() => openEdit(row)}
                          aria-label="Редактировать"
                        >
                          <IconEdit size={15} />
                        </Button>

                        <Button
                          variant="light"
                          color="red"
                          size="xs"
                          onClick={() => void handleDelete(row)}
                          aria-label="Удалить"
                        >
                          <IconTrash size={15} />
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}

                {filteredRows.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={fields.length + 2}>
                      <Text ta="center" c="dimmed" py="lg">
                        Записи не найдены
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Text size="sm" c="dimmed" mt="md">
          Показано записей: {filteredRows.length}
        </Text>
      </Card>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editing ? `Редактирование: ${title}` : `Новая запись: ${title}`}
        centered
      >
        <Stack>
          {fields.map((field) => (
            <TextInput
              key={field.name}
              label={field.label}
              placeholder={field.placeholder}
              required={field.required}
              value={form[field.name] ?? ""}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  [field.name]: event.currentTarget.value,
                }))
              }
            />
          ))}

          {error && (
            <Alert color="red" title="Не удалось сохранить">
              {error}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setModalOpened(false)}
            >
              Отмена
            </Button>

            <Button loading={saving} onClick={() => void handleSubmit()}>
              Сохранить
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

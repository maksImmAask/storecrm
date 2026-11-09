import { useCallback, useEffect, useState, type FormEvent } from "react";
import axios from "axios";
import {
  ActionIcon,
  Alert,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBuildingStore,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";

import api from "../api/client";

interface Company {
  id: number;
  name: string;
  phone: string;
  address: string;
  created_at: string;
}

interface ApiList<T> {
  results?: T[];
}

function getItems<T>(data: T[] | ApiList<T>): T[] {
  return Array.isArray(data) ? data : data.results ?? [];
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (data?.detail) return String(data.detail);

    if (data && typeof data === "object") {
      return Object.entries(data)
        .map(([key, value]) => {
          const message = Array.isArray(value)
            ? value.join(", ")
            : String(value);

          return `${key}: ${message}`;
        })
        .join("\n");
    }

    return error.message;
  }

  return "Произошла неизвестная ошибка.";
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/companies/");
      setCompanies(getItems<Company>(response.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  function resetForm() {
    setName("");
    setPhone("");
    setAddress("");
    setEditingCompany(null);
  }

  function openCreateModal() {
    resetForm();
    setError("");
    setModalOpened(true);
  }

  function openEditModal(company: Company) {
    setEditingCompany(company);
    setName(company.name);
    setPhone(company.phone);
    setAddress(company.address);
    setError("");
    setModalOpened(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpened(false);
    resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Заполните все поля.");
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
    };

    setSaving(true);
    setError("");

    try {
      if (editingCompany) {
        await api.patch(`/companies/${editingCompany.id}/`, payload);
      } else {
        await api.post("/companies/", payload);
      }

      setModalOpened(false);
      resetForm();
      await loadCompanies();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(company: Company) {
    const confirmed = window.confirm(
      `Удалить компанию «${company.name}»?`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.delete(`/companies/${company.id}/`);
      await loadCompanies();
    } catch (err) {
      setError(
        `${getErrorMessage(err)}\nВозможно, у компании уже есть связанные данные.`,
      );
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>Компании</Title>
          <Text size="sm" c="dimmed">
            Управление компаниями и реквизитами
          </Text>
        </div>

        <Group>
          <Tooltip label="Обновить">
            <ActionIcon
              size="lg"
              variant="light"
              onClick={() => void loadCompanies()}
              loading={loading}
            >
              <IconRefresh size={19} />
            </ActionIcon>
          </Tooltip>

          <Button
            leftSection={<IconPlus size={17} />}
            onClick={openCreateModal}
          >
            Добавить компанию
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert
          color="red"
          title="Ошибка"
          withCloseButton
          onClose={() => setError("")}
        >
          <Text style={{ whiteSpace: "pre-wrap" }}>{error}</Text>
        </Alert>
      )}

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : companies.length === 0 ? (
          <Stack align="center" py="xl">
            <IconBuildingStore size={40} color="gray" />
            <Text fw={500}>Компаний пока нет</Text>
            <Text size="sm" c="dimmed">
              Создайте первую компанию.
            </Text>
            <Button onClick={openCreateModal} leftSection={<IconPlus size={16} />}>
              Создать компанию
            </Button>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={650}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Название</Table.Th>
                  <Table.Th>Телефон</Table.Th>
                  <Table.Th>Адрес</Table.Th>
                  <Table.Th ta="right">Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {companies.map((company) => (
                  <Table.Tr key={company.id}>
                    <Table.Td>{company.id}</Table.Td>
                    <Table.Td>
                      <Text fw={500}>{company.name}</Text>
                    </Table.Td>
                    <Table.Td>{company.phone}</Table.Td>
                    <Table.Td>{company.address}</Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip label="Редактировать">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => openEditModal(company)}
                          >
                            <IconEdit size={17} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Удалить">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => void handleDelete(company)}
                          >
                            <IconTrash size={17} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Paper>

      <Text size="sm" c="dimmed">
        Всего компаний: {companies.length}
      </Text>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        centered
        title={editingCompany ? "Редактировать компанию" : "Новая компания"}
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Название компании"
              placeholder="Например: Tech Store"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
            />

            <TextInput
              label="Телефон"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(event) => setPhone(event.currentTarget.value)}
              required
            />

            <Textarea
              label="Адрес"
              placeholder="Введите адрес компании"
              value={address}
              onChange={(event) => setAddress(event.currentTarget.value)}
              minRows={3}
              required
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal} disabled={saving}>
                Отмена
              </Button>

              <Button type="submit" loading={saving}>
                {editingCompany ? "Сохранить" : "Создать"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
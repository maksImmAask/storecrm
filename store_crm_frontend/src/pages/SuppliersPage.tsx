
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import api from "../api/client";

interface Company {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  company: number;
  company_name?: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
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
        .map(([key, value]) =>
          `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`,
        )
        .join("\n");
    }

    return error.message;
  }

  return "Произошла неизвестная ошибка.";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [supplierResponse, companyResponse] = await Promise.all([
        api.get("/suppliers/"),
        api.get("/companies/"),
      ]);

      setSuppliers(getItems<Supplier>(supplierResponse.data));
      setCompanies(getItems<Company>(companyResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return suppliers;

    return suppliers.filter((supplier) =>
      [
        supplier.name,
        supplier.company_name ?? "",
        supplier.contact_person ?? "",
        supplier.phone,
        supplier.email,
        supplier.address,
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [suppliers, search]);

  function resetForm() {
    setCompanyId(null);
    setName("");
    setContactPerson("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    setIsActive(true);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setError("");
    setModalOpened(true);
  }

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setCompanyId(String(supplier.company));
    setName(supplier.name);
    setContactPerson(supplier.contact_person ?? "");
    setPhone(supplier.phone ?? "");
    setEmail(supplier.email ?? "");
    setAddress(supplier.address ?? "");
    setNotes(supplier.notes ?? "");
    setIsActive(supplier.is_active);
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

    if (!companyId || !name.trim()) {
      setError("Выберите компанию и укажите название поставщика.");
      return;
    }

    const payload = {
      company: Number(companyId),
      name: name.trim(),
      contact_person: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      notes: notes.trim(),
      is_active: isActive,
    };

    setSaving(true);
    setError("");

    try {
      if (editing) {
        await api.patch(`/suppliers/${editing.id}/`, payload);
      } else {
        await api.post("/suppliers/", payload);
      }

      setModalOpened(false);
      resetForm();
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    const confirmed = window.confirm(
      `Удалить поставщика «${supplier.name}»?`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.delete(`/suppliers/${supplier.id}/`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const companyOptions = companies.map((company) => ({
    value: String(company.id),
    label: company.name,
  }));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>Поставщики</Title>
          <Text size="sm" c="dimmed">
            Управление поставщиками и их контактными данными
          </Text>
        </div>

        <Group>
          <Tooltip label="Обновить">
            <ActionIcon
              size="lg"
              variant="light"
              onClick={() => void loadData()}
              loading={loading}
            >
              <IconRefresh size={19} />
            </ActionIcon>
          </Tooltip>

          <Button
            leftSection={<IconPlus size={17} />}
            onClick={openCreate}
          >
            Добавить поставщика
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

      <Paper withBorder p="md" radius="md">
        <TextInput
          placeholder="Поиск по названию, компании, телефону или email..."
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          mb="md"
        />

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : filteredSuppliers.length === 0 ? (
          <Stack align="center" py="xl">
            <Text fw={500}>Поставщики не найдены</Text>
            <Text size="sm" c="dimmed">
              Создайте первого поставщика или измените поиск.
            </Text>
            <Button
              onClick={openCreate}
              leftSection={<IconPlus size={16} />}
            >
              Создать поставщика
            </Button>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={950}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Поставщик</Table.Th>
                  <Table.Th>Компания</Table.Th>
                  <Table.Th>Контактное лицо</Table.Th>
                  <Table.Th>Телефон</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th ta="right">Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredSuppliers.map((supplier) => (
                  <Table.Tr key={supplier.id}>
                    <Table.Td>{supplier.id}</Table.Td>
                    <Table.Td>
                      <Text fw={500}>{supplier.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      {supplier.company_name ??
                        companies.find((c) => c.id === supplier.company)?.name ??
                        "—"}
                    </Table.Td>
                    <Table.Td>{supplier.contact_person || "—"}</Table.Td>
                    <Table.Td>{supplier.phone || "—"}</Table.Td>
                    <Table.Td>{supplier.email || "—"}</Table.Td>
                    <Table.Td>
                      <Badge color={supplier.is_active ? "green" : "gray"}>
                        {supplier.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip label="Редактировать">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => openEdit(supplier)}
                          >
                            <IconEdit size={17} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Удалить">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => void handleDelete(supplier)}
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
        Всего поставщиков: {suppliers.length} · Найдено: {filteredSuppliers.length}
      </Text>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        centered
        title={editing ? "Редактировать поставщика" : "Новый поставщик"}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <Select
              label="Компания"
              placeholder="Выберите компанию"
              data={companyOptions}
              value={companyId}
              onChange={(value) => setCompanyId(value)}
              searchable
              required
            />

            <TextInput
              label="Название поставщика"
              placeholder="Например, ООО Supplier"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
            />

            <TextInput
              label="Контактное лицо"
              placeholder="Имя контактного лица"
              value={contactPerson}
              onChange={(event) => setContactPerson(event.currentTarget.value)}
            />

            <TextInput
              label="Телефон"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(event) => setPhone(event.currentTarget.value)}
            />

            <TextInput
              label="Электронная почта"
              placeholder="supplier@example.com"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />

            <Textarea
              label="Адрес"
              placeholder="Город, улица, дом"
              value={address}
              onChange={(event) => setAddress(event.currentTarget.value)}
            />

            <Textarea
              label="Заметки"
              placeholder="Дополнительная информация"
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
            />

            <Switch
              label="Поставщик активен"
              checked={isActive}
              onChange={(event) => setIsActive(event.currentTarget.checked)}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={closeModal}
                disabled={saving}
              >
                Отмена
              </Button>

              <Button type="submit" loading={saving}>
                {editing ? "Сохранить" : "Создать"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}


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
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import api from "../api/client";

interface Company {
  id: number;
  name: string;
}

interface Customer {
  id: number;
  company: number;
  company_name?: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  address: string;
  balance: string | number;
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
        .map(([key, value]) => {
          const message = Array.isArray(value)
            ? value.join(", ")
            : typeof value === "object"
              ? JSON.stringify(value)
              : String(value);

          return `${key}: ${message}`;
        })
        .join("\n");
    }

    return error.message;
  }

  return "Произошла неизвестная ошибка.";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);

  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [customersResponse, companiesResponse] = await Promise.all([
        api.get("/customers/"),
        api.get("/companies/"),
      ]);

      setCustomers(getItems<Customer>(customersResponse.data));
      setCompanies(getItems<Company>(companiesResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const matchesCompany =
        !companyFilter || String(customer.company) === companyFilter;

      const fullName =
        `${customer.first_name} ${customer.last_name}`.toLowerCase();

      const matchesSearch =
        !query ||
        [
          fullName,
          customer.first_name,
          customer.last_name,
          customer.phone,
          customer.email,
          customer.address,
          customer.company_name ?? "",
        ].some((value) => value.toLowerCase().includes(query));

      return matchesCompany && matchesSearch;
    });
  }, [customers, search, companyFilter]);

  const companyOptions = companies.map((company) => ({
    value: String(company.id),
    label: company.name,
  }));

  function resetForm() {
    setCompanyId(null);
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setIsActive(true);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setError("");
    setModalOpened(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setCompanyId(String(customer.company));
    setFirstName(customer.first_name ?? "");
    setLastName(customer.last_name ?? "");
    setPhone(customer.phone ?? "");
    setEmail(customer.email ?? "");
    setAddress(customer.address ?? "");
    setIsActive(customer.is_active);
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

    if (!companyId || !firstName.trim()) {
      setError("Выберите компанию и укажите имя клиента.");
      return;
    }

    const payload = {
      company: Number(companyId),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim(),
      is_active: isActive,
    };

    setSaving(true);
    setError("");

    try {
      if (editing) {
        await api.patch(`/customers/${editing.id}/`, payload);
      } else {
        await api.post("/customers/", payload);
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

  async function handleDelete(customer: Customer) {
    const fullName = `${customer.first_name} ${customer.last_name}`.trim();

    if (!window.confirm(`Удалить клиента «${fullName}»?`)) return;

    setError("");

    try {
      await api.delete(`/customers/${customer.id}/`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>Клиенты</Title>
          <Text size="sm" c="dimmed">
            База клиентов магазина: контактные данные и поиск.
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

          <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
            Добавить клиента
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
        <Group align="end" mb="md">
          <TextInput
            style={{ flex: 1 }}
            placeholder="Поиск по имени, телефону, email..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />

          <Select
            w={240}
            label="Компания"
            placeholder="Все компании"
            data={companyOptions}
            value={companyFilter}
            onChange={(value) => setCompanyFilter(value)}
            clearable
            searchable
          />
        </Group>

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : filteredCustomers.length === 0 ? (
          <Stack align="center" py="xl">
            <IconUsers size={40} color="gray" />
            <Text fw={500}>Клиенты не найдены</Text>
            <Text size="sm" c="dimmed">
              Создайте первого клиента или измените параметры поиска.
            </Text>
            <Button
              onClick={openCreate}
              leftSection={<IconPlus size={16} />}
            >
              Создать клиента
            </Button>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={950}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Имя</Table.Th>
                  <Table.Th>Компания</Table.Th>
                  <Table.Th>Телефон</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Баланс</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th ta="right">Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredCustomers.map((customer) => (
                  <Table.Tr key={customer.id}>
                    <Table.Td>{customer.id}</Table.Td>

                    <Table.Td>
                      <Text fw={500}>
                        {customer.first_name} {customer.last_name}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      {customer.company_name ??
                        companies.find((c) => c.id === customer.company)?.name ??
                        "—"}
                    </Table.Td>

                    <Table.Td>{customer.phone || "—"}</Table.Td>
                    <Table.Td>{customer.email || "—"}</Table.Td>
                    <Table.Td>{customer.balance ?? 0}</Table.Td>

                    <Table.Td>
                      <Badge color={customer.is_active ? "green" : "gray"}>
                        {customer.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </Table.Td>

                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip label="Редактировать">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => openEdit(customer)}
                          >
                            <IconEdit size={17} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Удалить">
                          <ActionIcon
                            color="red"
                            variant="light"
                            onClick={() => void handleDelete(customer)}
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
        Всего клиентов: {customers.length} · Найдено: {filteredCustomers.length}
      </Text>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        centered
        title={editing ? "Редактировать клиента" : "Новый клиент"}
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
              nothingFoundMessage="Компании не найдены"
            />

            <TextInput
              label="Имя"
              placeholder="Введите имя клиента"
              value={firstName}
              onChange={(event) => setFirstName(event.currentTarget.value)}
              required
            />

            <TextInput
              label="Фамилия"
              placeholder="Введите фамилию клиента"
              value={lastName}
              onChange={(event) => setLastName(event.currentTarget.value)}
            />

            <TextInput
              label="Телефон"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(event) => setPhone(event.currentTarget.value)}
            />

            <TextInput
              label="Электронная почта"
              placeholder="client@example.com"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
            />

            <TextInput
              label="Адрес"
              placeholder="Город, улица, дом"
              value={address}
              onChange={(event) => setAddress(event.currentTarget.value)}
            />

            <Switch
              label="Клиент активен"
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

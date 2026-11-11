
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import {
  ActionIcon,
  Alert,
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
  Textarea,
  Title,
  Tooltip,
  Badge,
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
}

interface Branch {
  id: number;
  company: number;
  company_name?: string;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  created_at?: string;
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
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
        .join("\n");
    }
    return error.message;
  }
  return "Произошла неизвестная ошибка.";
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [branchResponse, companyResponse] = await Promise.all([
        api.get("/branches/"),
        api.get("/companies/"),
      ]);
      setBranches(getItems<Branch>(branchResponse.data));
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

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return branches;
    return branches.filter((branch) =>
      [
        branch.name,
        branch.address,
        branch.phone,
        branch.company_name ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [branches, search]);

  function resetForm() {
    setCompanyId(null);
    setName("");
    setAddress("");
    setPhone("");
    setIsActive(true);
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setError("");
    setModalOpened(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setCompanyId(String(branch.company));
    setName(branch.name);
    setAddress(branch.address);
    setPhone(branch.phone);
    setIsActive(branch.is_active);
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

    if (!companyId || !name.trim() || !address.trim() || !phone.trim()) {
      setError("Заполните все поля и выберите компанию.");
      return;
    }

    const payload = {
      company: Number(companyId),
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      is_active: isActive,
    };

    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.patch(`/branches/${editing.id}/`, payload);
      } else {
        await api.post("/branches/", payload);
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

  async function handleDelete(branch: Branch) {
    const confirmed = window.confirm(
      `Удалить филиал «${branch.name}»? Связанные склады и операции могут помешать удалению.`,
    );
    if (!confirmed) return;

    setError("");
    try {
      await api.delete(`/branches/${branch.id}/`);
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
          <Title order={3}>Филиалы</Title>
          <Text size="sm" c="dimmed">Управление филиалами компаний</Text>
        </div>
        <Group>
          <Tooltip label="Обновить">
            <ActionIcon size="lg" variant="light" onClick={() => void loadData()} loading={loading}>
              <IconRefresh size={19} />
            </ActionIcon>
          </Tooltip>
          <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
            Добавить филиал
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка" withCloseButton onClose={() => setError("")}>
          <Text style={{ whiteSpace: "pre-wrap" }}>{error}</Text>
        </Alert>
      )}

      <Paper withBorder p="md" radius="md">
        <TextInput
          placeholder="Поиск по названию, компании, адресу или телефону..."
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          mb="md"
        />

        {loading ? (
          <Group justify="center" py="xl"><Loader /></Group>
        ) : filteredBranches.length === 0 ? (
          <Stack align="center" py="xl">
            <IconBuildingStore size={40} color="gray" />
            <Text fw={500}>Филиалы не найдены</Text>
            <Text size="sm" c="dimmed">Создайте первый филиал или измените поиск.</Text>
            <Button onClick={openCreate} leftSection={<IconPlus size={16} />}>
              Создать филиал
            </Button>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={850}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Название</Table.Th>
                  <Table.Th>Компания</Table.Th>
                  <Table.Th>Адрес</Table.Th>
                  <Table.Th>Телефон</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th ta="right">Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredBranches.map((branch) => (
                  <Table.Tr key={branch.id}>
                    <Table.Td>{branch.id}</Table.Td>
                    <Table.Td><Text fw={500}>{branch.name}</Text></Table.Td>
                    <Table.Td>{branch.company_name ?? companies.find((c) => c.id === branch.company)?.name ?? "—"}</Table.Td>
                    <Table.Td>{branch.address}</Table.Td>
                    <Table.Td>{branch.phone}</Table.Td>
                    <Table.Td>
                      <Badge color={branch.is_active ? "green" : "gray"}>
                        {branch.is_active ? "Активен" : "Неактивен"}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip label="Редактировать">
                          <ActionIcon color="blue" variant="light" onClick={() => openEdit(branch)}>
                            <IconEdit size={17} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Удалить">
                          <ActionIcon color="red" variant="light" onClick={() => void handleDelete(branch)}>
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
        Всего филиалов: {branches.length} · Найдено: {filteredBranches.length}
      </Text>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        centered
        title={editing ? "Редактировать филиал" : "Новый филиал"}
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
              label="Название филиала"
              placeholder="Например: Центральный филиал"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
            />
            <Textarea
              label="Адрес"
              placeholder="Введите адрес филиала"
              value={address}
              onChange={(event) => setAddress(event.currentTarget.value)}
              minRows={2}
              required
            />
            <TextInput
              label="Телефон"
              placeholder="+998 90 123 45 67"
              value={phone}
              onChange={(event) => setPhone(event.currentTarget.value)}
              required
            />
            <Switch
              label="Филиал активен"
              checked={isActive}
              onChange={(event) => setIsActive(event.currentTarget.checked)}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeModal} disabled={saving}>Отмена</Button>
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

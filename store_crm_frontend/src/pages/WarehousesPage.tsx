
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
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconBuildingWarehouse,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import api from "../api/client";

interface Branch {
  id: number;
  name: string;
  company_name?: string;
}

interface Warehouse {
  id: number;
  branch: number;
  branch_name?: string;
  name: string;
  address: string;
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

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);

  const [modalOpened, setModalOpened] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [warehouseResponse, branchResponse] = await Promise.all([
        api.get("/warehouses/"),
        api.get("/branches/"),
      ]);
      setWarehouses(getItems<Warehouse>(warehouseResponse.data));
      setBranches(getItems<Branch>(branchResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredWarehouses = useMemo(() => {
    const query = search.trim().toLowerCase();
    return warehouses.filter((warehouse) => {
      const matchesBranch = !branchFilter || String(warehouse.branch) === branchFilter;
      const branchName =
        warehouse.branch_name ??
        branches.find((branch) => branch.id === warehouse.branch)?.name ??
        "";
      const matchesSearch =
        !query ||
        [warehouse.name, warehouse.address, branchName].some((value) =>
          value.toLowerCase().includes(query),
        );
      return matchesBranch && matchesSearch;
    });
  }, [warehouses, branches, search, branchFilter]);

  function resetForm() {
    setBranchId(null);
    setName("");
    setAddress("");
    setEditing(null);
  }

  function openCreate() {
    resetForm();
    setError("");
    setModalOpened(true);
  }

  function openEdit(warehouse: Warehouse) {
    setEditing(warehouse);
    setBranchId(String(warehouse.branch));
    setName(warehouse.name);
    setAddress(warehouse.address);
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

    if (!branchId || !name.trim() || !address.trim()) {
      setError("Выберите филиал и заполните все поля.");
      return;
    }

    const payload = {
      branch: Number(branchId),
      name: name.trim(),
      address: address.trim(),
    };

    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.patch(`/warehouses/${editing.id}/`, payload);
      } else {
        await api.post("/warehouses/", payload);
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

  async function handleDelete(warehouse: Warehouse) {
    const confirmed = window.confirm(
      `Удалить склад «${warehouse.name}»? Если на нём есть остатки или операции, сервер может запретить удаление.`,
    );
    if (!confirmed) return;

    setError("");
    try {
      await api.delete(`/warehouses/${warehouse.id}/`);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const branchOptions = branches.map((branch) => ({
    value: String(branch.id),
    label: branch.company_name
      ? `${branch.name} — ${branch.company_name}`
      : branch.name,
  }));

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={3}>Склады</Title>
          <Text size="sm" c="dimmed">Управление складами и местами хранения товаров</Text>
        </div>
        <Group>
          <Tooltip label="Обновить">
            <ActionIcon size="lg" variant="light" onClick={() => void loadData()} loading={loading}>
              <IconRefresh size={19} />
            </ActionIcon>
          </Tooltip>
          <Button leftSection={<IconPlus size={17} />} onClick={openCreate}>
            Добавить склад
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка" withCloseButton onClose={() => setError("")}>
          <Text style={{ whiteSpace: "pre-wrap" }}>{error}</Text>
        </Alert>
      )}

      <Paper withBorder p="md" radius="md">
        <Group align="end" mb="md">
          <TextInput
            style={{ flex: 1 }}
            placeholder="Поиск по названию, адресу или филиалу..."
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />
          <Select
            w={240}
            label="Фильтр по филиалу"
            placeholder="Все филиалы"
            data={branchOptions}
            value={branchFilter}
            onChange={(value) => setBranchFilter(value)}
            clearable
            searchable
          />
        </Group>

        {loading ? (
          <Group justify="center" py="xl"><Loader /></Group>
        ) : filteredWarehouses.length === 0 ? (
          <Stack align="center" py="xl">
            <IconBuildingWarehouse size={40} color="gray" />
            <Text fw={500}>Склады не найдены</Text>
            <Text size="sm" c="dimmed">Создайте первый склад или измените фильтры.</Text>
            <Button onClick={openCreate} leftSection={<IconPlus size={16} />}>
              Создать склад
            </Button>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={700}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Название склада</Table.Th>
                  <Table.Th>Филиал</Table.Th>
                  <Table.Th>Адрес</Table.Th>
                  <Table.Th ta="right">Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredWarehouses.map((warehouse) => (
                  <Table.Tr key={warehouse.id}>
                    <Table.Td>{warehouse.id}</Table.Td>
                    <Table.Td><Text fw={500}>{warehouse.name}</Text></Table.Td>
                    <Table.Td>
                      {warehouse.branch_name ??
                        branches.find((branch) => branch.id === warehouse.branch)?.name ??
                        "—"}
                    </Table.Td>
                    <Table.Td>{warehouse.address}</Table.Td>
                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip label="Редактировать">
                          <ActionIcon color="blue" variant="light" onClick={() => openEdit(warehouse)}>
                            <IconEdit size={17} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Удалить">
                          <ActionIcon color="red" variant="light" onClick={() => void handleDelete(warehouse)}>
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
        Всего складов: {warehouses.length} · Найдено: {filteredWarehouses.length}
      </Text>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        centered
        title={editing ? "Редактировать склад" : "Новый склад"}
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <Select
              label="Филиал"
              placeholder="Выберите филиал"
              data={branchOptions}
              value={branchId}
              onChange={(value) => setBranchId(value)}
              searchable
              required
              nothingFoundMessage="Филиалы не найдены"
            />
            <TextInput
              label="Название склада"
              placeholder="Например: Основной склад"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
            />
            <TextInput
              label="Адрес"
              placeholder="Введите адрес склада"
              value={address}
              onChange={(event) => setAddress(event.currentTarget.value)}
              required
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

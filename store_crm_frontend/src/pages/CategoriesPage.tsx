import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import axios from "axios";
import {
  Alert,
  ActionIcon,
  Button,
  Center,
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
  IconCategory,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";

import api from "../api/client";

interface Company {
  id: number;
  name: string;
}

interface Category {
  id: number;
  company: number;
  company_name: string;
  name: string;
  parent: number | null;
  parent_name: string | null;
  created_at: string;
}

interface ApiList<T> {
  results?: T[];
}

function getItems<T>(data: T[] | ApiList<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }

  return data.results ?? [];
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string") {
      return data;
    }

    if (data?.detail) {
      return String(data.detail);
    }

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
        .join("\n");
    }

    return error.message;
  }

  return "Произошла неизвестная ошибка.";
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(
    null,
  );

  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [parentId, setParentId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [companiesResponse, categoriesResponse] = await Promise.all([
        api.get("/companies/"),
        api.get("/categories/"),
      ]);

      setCompanies(getItems<Company>(companiesResponse.data));
      setCategories(getItems<Category>(categoriesResponse.data));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return categories;
    }

    return categories.filter((category) => {
      return (
        category.name.toLowerCase().includes(query) ||
        category.company_name.toLowerCase().includes(query) ||
        (category.parent_name ?? "").toLowerCase().includes(query)
      );
    });
  }, [categories, search]);

  const parentOptions = useMemo(() => {
    if (!companyId) {
      return [];
    }

    return categories
      .filter(
        (category) =>
          category.company === Number(companyId) &&
          category.id !== editingCategory?.id,
      )
      .map((category) => ({
        value: String(category.id),
        label: category.name,
      }));
  }, [categories, companyId, editingCategory]);

  function openCreateModal() {
    setEditingCategory(null);
    setName("");
    setCompanyId(companies.length === 1 ? String(companies[0].id) : null);
    setParentId(null);
    setError("");
    setModalOpened(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setName(category.name);
    setCompanyId(String(category.company));
    setParentId(category.parent ? String(category.parent) : null);
    setError("");
    setModalOpened(true);
  }

  function closeModal() {
    if (saving) {
      return;
    }

    setModalOpened(false);
    setEditingCategory(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Введите название категории.");
      return;
    }

    if (!companyId) {
      setError("Выберите компанию.");
      return;
    }

    const payload = {
      name: name.trim(),
      company: Number(companyId),
      parent: parentId ? Number(parentId) : null,
    };

    setSaving(true);
    setError("");

    try {
      if (editingCategory) {
        await api.patch(`/categories/${editingCategory.id}/`, payload);
      } else {
        await api.post("/categories/", payload);
      }

      setModalOpened(false);
      setEditingCategory(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(
      `Удалить категорию «${category.name}»?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await api.delete(`/categories/${category.id}/`);
      await loadData();
    } catch (err) {
      setError(
        `${getErrorMessage(err)}\n\nЕсли в категории есть товары, сначала перенесите их в другую категорию.`,
      );
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Категории товаров</Title>
          <Text size="sm" c="dimmed">
            Создание и управление категориями товаров
          </Text>
        </div>

        <Group>
          <Tooltip label="Обновить список">
            <ActionIcon
              variant="light"
              size="lg"
              onClick={() => void loadData()}
              loading={loading}
            >
              <IconRefresh size={19} />
            </ActionIcon>
          </Tooltip>

          <Button
            leftSection={<IconPlus size={17} />}
            onClick={openCreateModal}
            disabled={companies.length === 0}
          >
            Добавить категорию
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка" withCloseButton onClose={() => setError("")}>
          <Text style={{ whiteSpace: "pre-wrap" }}>{error}</Text>
        </Alert>
      )}

      {companies.length === 0 && !loading && (
        <Alert color="yellow" title="Нет компаний">
          Сначала создайте компанию в разделе «Компании», чтобы добавлять
          категории товаров.
        </Alert>
      )}

      <Paper withBorder p="md" radius="md">
        <TextInput
          placeholder="Поиск по названию, компании или родительской категории..."
          leftSection={<IconSearch size={17} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </Paper>

      <Paper withBorder radius="md" p="md">
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filteredCategories.length === 0 ? (
          <Center py="xl">
            <Stack align="center" gap="xs">
              <IconCategory size={36} color="gray" />
              <Text fw={500}>Категории не найдены</Text>
              <Text size="sm" c="dimmed">
                Создайте первую категорию товаров.
              </Text>
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={650}>
            <Table highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Название</Table.Th>
                  <Table.Th>Компания</Table.Th>
                  <Table.Th>Родительская категория</Table.Th>
                  <Table.Th ta="right">Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredCategories.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>{category.id}</Table.Td>

                    <Table.Td>
                      <Group gap="xs">
                        <IconCategory size={17} color="gray" />
                        <Text fw={500}>{category.name}</Text>
                      </Group>
                    </Table.Td>

                    <Table.Td>{category.company_name}</Table.Td>

                    <Table.Td>
                      {category.parent_name || (
                        <Text size="sm" c="dimmed">
                          Основная категория
                        </Text>
                      )}
                    </Table.Td>

                    <Table.Td>
                      <Group justify="flex-end" gap="xs">
                        <Tooltip label="Редактировать">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openEditModal(category)}
                          >
                            <IconEdit size={17} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Удалить">
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => void handleDelete(category)}
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
        Всего категорий: {categories.length}
      </Text>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingCategory ? "Редактировать категорию" : "Новая категория"}
        centered
      >
        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label="Название категории"
              placeholder="Например: Смартфоны"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
            />

            <Select
              label="Компания"
              placeholder="Выберите компанию"
              data={companies.map((company) => ({
                value: String(company.id),
                label: company.name,
              }))}
              value={companyId}
              onChange={(value) => {
                setCompanyId(value);
                setParentId(null);
              }}
              searchable
              required
            />

            <Select
              label="Родительская категория"
              placeholder="Без родительской категории"
              data={parentOptions}
              value={parentId}
              onChange={(value) => setParentId(value)}
              clearable
              searchable
              disabled={!companyId}
              nothingFoundMessage="Категории не найдены"
            />

            <Text size="xs" c="dimmed">
              Если родительская категория не выбрана, категория будет основной.
            </Text>

            <Group justify="flex-end" mt="md">
              <Button
                variant="default"
                onClick={closeModal}
                disabled={saving}
              >
                Отмена
              </Button>

              <Button type="submit" loading={saving}>
                {editingCategory ? "Сохранить" : "Создать"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconRefresh,
  IconSearch,
  IconEdit,
  IconTrash,
  IconCash,
  IconReceipt,
} from "@tabler/icons-react";
import api from "../api/client";

interface Company {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
  company: number;
}

interface ExpenseCategory {
  id: number;
  company: number;
  name: string;
  is_active: boolean;
}

interface Expense {
  id: number;
  company: number;
  branch: number;
  category: number;
  amount: string | number;
  payment_method: "cash" | "card" | "bank";
  description: string;
  expense_date: string;
  created_by: number;
  created_at: string;
}

interface ExpenseForm {
  company: string;
  branch: string;
  category: string;
  amount: number | string;
  payment_method: string;
  description: string;
  expense_date: string;
}

function getList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (
    data &&
    typeof data === "object" &&
    "results" in data &&
    Array.isArray((data as { results: unknown }).results)
  ) {
    return (data as { results: T[] }).results;
  }

  return [];
}

function getError(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: unknown;
        };
      }
    ).response;

    if (response?.data) {
      return JSON.stringify(response.data);
    }
  }

  return "Произошла ошибка. Проверьте подключение к серверу.";
}

function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: ExpenseForm = {
  company: "",
  branch: "",
  category: "",
  amount: "",
  payment_method: "cash",
  description: "",
  expense_date: today(),
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [editingExpense, setEditingExpense] = useState<number | null>(null);

  const [form, setForm] = useState<ExpenseForm>(emptyForm);

  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<string | null>(null);

  const [categoryModal, setCategoryModal] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [categorySaving, setCategorySaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [expenseRes, companyRes, branchRes, categoryRes] =
        await Promise.all([
          api.get("/expenses/"),
          api.get("/companies/"),
          api.get("/branches/"),
          api.get("/expense-categories/"),
        ]);

      setExpenses(getList<Expense>(expenseRes.data));
      setCompanies(getList<Company>(companyRes.data));
      setBranches(getList<Branch>(branchRes.data));
      setCategories(getList<ExpenseCategory>(categoryRes.data));
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedCompany = form.company
    ? Number(form.company)
    : null;

  const availableBranches = useMemo(
    () =>
      branches.filter(
        (branch) =>
          !selectedCompany || branch.company === selectedCompany,
      ),
    [branches, selectedCompany],
  );

  const availableCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.is_active &&
          (!selectedCompany || category.company === selectedCompany),
      ),
    [categories, selectedCompany],
  );

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch =
        !search ||
        expense.description.toLowerCase().includes(search.toLowerCase()) ||
        categories
          .find((category) => category.id === expense.category)
          ?.name.toLowerCase()
          .includes(search.toLowerCase());

      const matchesBranch =
        !branchFilter || String(expense.branch) === branchFilter;

      const matchesCategory =
        !categoryFilter || String(expense.category) === categoryFilter;

      const matchesPayment =
        !paymentFilter || expense.payment_method === paymentFilter;

      return (
        matchesSearch &&
        matchesBranch &&
        matchesCategory &&
        matchesPayment
      );
    });
  }, [
    expenses,
    categories,
    search,
    branchFilter,
    categoryFilter,
    paymentFilter,
  ]);

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  const todayAmount = filteredExpenses
    .filter((expense) => expense.expense_date === today())
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const openCreate = () => {
    setEditingExpense(null);

    setForm({
      ...emptyForm,
      company: companies[0] ? String(companies[0].id) : "",
    });

    setError("");
    setModalOpened(true);
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense.id);

    setForm({
      company: String(expense.company),
      branch: String(expense.branch),
      category: String(expense.category),
      amount: expense.amount,
      payment_method: expense.payment_method,
      description: expense.description,
      expense_date: expense.expense_date,
    });

    setError("");
    setModalOpened(true);
  };

  const saveExpense = async () => {
    if (
      !form.company ||
      !form.branch ||
      !form.category ||
      !form.amount ||
      Number(form.amount) <= 0 ||
      !form.expense_date
    ) {
      setError("Заполните все обязательные поля.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      company: Number(form.company),
      branch: Number(form.branch),
      category: Number(form.category),
      amount: Number(form.amount),
      payment_method: form.payment_method,
      description: form.description,
      expense_date: form.expense_date,
    };

    try {
      if (editingExpense) {
        await api.patch(`/expenses/${editingExpense}/`, payload);
      } else {
        await api.post("/expenses/", payload);
      }

      setModalOpened(false);
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (id: number) => {
    if (!window.confirm("Удалить этот расход?")) return;

    try {
      await api.delete(`/expenses/${id}/`);
      await loadData();
    } catch (err) {
      setError(getError(err));
    }
  };

  const createCategory = async () => {
    if (!newCategory.trim() || !form.company) return;

    setCategorySaving(true);

    try {
      await api.post("/expense-categories/", {
        company: Number(form.company),
        name: newCategory.trim(),
        is_active: true,
      });

      const response = await api.get("/expense-categories/");
      const updated = getList<ExpenseCategory>(response.data);

      setCategories(updated);

      const created = updated.find(
        (item) =>
          item.name === newCategory.trim() &&
          item.company === Number(form.company),
      );

      if (created) {
        setForm((prev) => ({
          ...prev,
          category: String(created.id),
        }));
      }

      setNewCategory("");
      setCategoryModal(false);
    } catch (err) {
      setError(getError(err));
    } finally {
      setCategorySaving(false);
    }
  };

  const getBranchName = (id: number) =>
    branches.find((branch) => branch.id === id)?.name ?? `#${id}`;

  const getCategoryName = (id: number) =>
    categories.find((category) => category.id === id)?.name ?? `#${id}`;

  const paymentLabel = (method: string) => {
    if (method === "cash") return "Наличные";
    if (method === "card") return "Карта";
    if (method === "bank") return "Банковский перевод";
    return method;
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Расходы</Title>
          <Text c="dimmed" size="sm">
            Управление расходами компании
          </Text>
        </div>

        <Group>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void loadData()}
          >
            Обновить
          </Button>

          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreate}
          >
            Добавить расход
          </Button>
        </Group>
      </Group>

      {error && (
        <Card withBorder>
          <Text c="red" size="sm">{error}</Text>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Всего расходов</Text>
            <IconReceipt size={22} />
          </Group>
          <Title order={2} mt="sm">
            {formatMoney(totalAmount)}
          </Title>
          <Text size="xs" c="dimmed">С учётом фильтров</Text>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Расходы сегодня</Text>
            <IconCash size={22} />
          </Group>
          <Title order={2} mt="sm">
            {formatMoney(todayAmount)}
          </Title>
          <Text size="xs" c="dimmed">За текущую дату</Text>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Количество операций</Text>
            <IconReceipt size={22} />
          </Group>
          <Title order={2} mt="sm">
            {filteredExpenses.length}
          </Title>
          <Text size="xs" c="dimmed">Найдено записей</Text>
        </Card>
      </SimpleGrid>

      <Card withBorder>
        <Grid align="end">
          <Grid.Col span={{ base: 12, md: 3 }}>
            <TextInput
              label="Поиск"
              placeholder="Описание или категория"
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Филиал"
              placeholder="Все филиалы"
              clearable
              data={branches.map((branch) => ({
                value: String(branch.id),
                label: branch.name,
              }))}
              value={branchFilter}
              onChange={(value) => setBranchFilter(value)}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Категория"
              placeholder="Все категории"
              clearable
              data={categories.map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
              value={categoryFilter}
              onChange={(value) => setCategoryFilter(value)}
            />
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 3 }}>
            <Select
              label="Оплата"
              placeholder="Все способы"
              clearable
              data={[
                { value: "cash", label: "Наличные" },
                { value: "card", label: "Карта" },
                { value: "bank", label: "Банковский перевод" },
              ]}
              value={paymentFilter}
              onChange={(value) => setPaymentFilter(value)}
            />
          </Grid.Col>
        </Grid>
      </Card>

      <Card withBorder>
        {loading ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : (
          <Table.ScrollContainer minWidth={900}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Филиал</Table.Th>
                  <Table.Th>Категория</Table.Th>
                  <Table.Th>Описание</Table.Th>
                  <Table.Th>Способ оплаты</Table.Th>
                  <Table.Th>Сумма</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredExpenses.map((expense) => (
                  <Table.Tr key={expense.id}>
                    <Table.Td>#{expense.id}</Table.Td>
                    <Table.Td>{expense.expense_date}</Table.Td>
                    <Table.Td>{getBranchName(expense.branch)}</Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {getCategoryName(expense.category)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {expense.description || "—"}
                    </Table.Td>
                    <Table.Td>
                      {paymentLabel(expense.payment_method)}
                    </Table.Td>
                    <Table.Td>
                      <Text fw={600}>
                        {formatMoney(expense.amount)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap={5} wrap="nowrap">
                        <Tooltip label="Редактировать">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openEdit(expense)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Удалить">
                          <ActionIcon
                            variant="light"
                            color="red"
                            onClick={() => void deleteExpense(expense.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}

                {filteredExpenses.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text ta="center" c="dimmed" py="xl">
                        Расходы не найдены
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title={editingExpense ? "Редактировать расход" : "Новый расход"}
        centered
        size="lg"
      >
        <Stack>
          <Select
            label="Компания"
            placeholder="Выберите компанию"
            data={companies.map((company) => ({
              value: String(company.id),
              label: company.name,
            }))}
            value={form.company || null}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                company: value ?? "",
                branch: "",
                category: "",
              }))
            }
            required
          />

          <Select
            label="Филиал"
            placeholder="Выберите филиал"
            data={availableBranches.map((branch) => ({
              value: String(branch.id),
              label: branch.name,
            }))}
            value={form.branch || null}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                branch: value ?? "",
              }))
            }
            required
          />

          <Group align="end" wrap="nowrap">
            <Select
              style={{ flex: 1 }}
              label="Категория"
              placeholder="Выберите категорию"
              data={availableCategories.map((category) => ({
                value: String(category.id),
                label: category.name,
              }))}
              value={form.category || null}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  category: value ?? "",
                }))
              }
              required
            />

            <Button
              variant="light"
              onClick={() => setCategoryModal(true)}
              disabled={!form.company}
            >
              +
            </Button>
          </Group>

          <NumberInput
            label="Сумма"
            placeholder="Введите сумму"
            min={0.01}
            decimalScale={2}
            value={form.amount}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                amount: value,
              }))
            }
            required
          />

          <Select
            label="Способ оплаты"
            data={[
              { value: "cash", label: "Наличные" },
              { value: "card", label: "Карта" },
              { value: "bank", label: "Банковский перевод" },
            ]}
            value={form.payment_method}
            onChange={(value) =>
              setForm((prev) => ({
                ...prev,
                payment_method: value ?? "cash",
              }))
            }
            required
          />

          <TextInput
            type="date"
            label="Дата расхода"
            value={form.expense_date}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                expense_date: event.currentTarget.value,
              }))
            }
            required
          />

          <Textarea
            label="Описание"
            placeholder="Дополнительная информация"
            minRows={3}
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                description: event.currentTarget.value,
              }))
            }
          />

          {error && <Text c="red" size="sm">{error}</Text>}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setModalOpened(false)}
            >
              Отмена
            </Button>

            <Button loading={saving} onClick={() => void saveExpense()}>
              {editingExpense ? "Сохранить" : "Создать"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={categoryModal}
        onClose={() => setCategoryModal(false)}
        title="Новая категория расходов"
        centered
      >
        <Stack>
          <TextInput
            label="Название категории"
            placeholder="Например, Аренда"
            value={newCategory}
            onChange={(event) =>
              setNewCategory(event.currentTarget.value)
            }
          />

          <Button
            loading={categorySaving}
            disabled={!newCategory.trim()}
            onClick={() => void createCategory()}
          >
            Создать категорию
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

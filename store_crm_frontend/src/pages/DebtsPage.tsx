
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  Progress,
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
  IconCash,
  IconHistory,
  IconRefresh,
  IconSearch,
  IconWallet,
} from "@tabler/icons-react";
import api from "../api/client";

interface DebtPayment {
  id: number;
  debt: number;
  amount: string | number;
  comment: string;
  created_at: string;
}

interface Debt {
  id: number;
  customer: number;
  customer_name: string;
  sale: number;
  original_amount: string | number;
  remaining_amount: string | number;
  status: "active" | "partially_paid" | "paid";
  created_at: string;
  payments: DebtPayment[];
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
      const data = response.data;

      if (typeof data === "string") return data;

      if (typeof data === "object") {
        return Object.entries(data)
          .map(([key, value]) => {
            const message = Array.isArray(value)
              ? value.join(", ")
              : String(value);
            return `${key}: ${message}`;
          })
          .join("\n");
      }
    }
  }

  return "Произошла ошибка. Проверьте подключение к серверу.";
}

function money(value: string | number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function statusInfo(status: Debt["status"]) {
  switch (status) {
    case "active":
      return { label: "Активный", color: "red" };
    case "partially_paid":
      return { label: "Частично оплачен", color: "yellow" };
    case "paid":
      return { label: "Оплачен", color: "green" };
    default:
      return { label: status, color: "gray" };
  }
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [paymentOpened, setPaymentOpened] = useState(false);
  const [historyOpened, setHistoryOpened] = useState(false);

  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | string>("");
  const [paymentComment, setPaymentComment] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDebts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/debts/");
      setDebts(getList<Debt>(response.data));
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDebts();
  }, [loadDebts]);

  const filteredDebts = useMemo(() => {
    return debts.filter((debt) => {
      const query = search.toLowerCase().trim();

      const matchesSearch =
        !query ||
        String(debt.id).includes(query) ||
        String(debt.sale).includes(query) ||
        (debt.customer_name ?? "").toLowerCase().includes(query);

      const matchesStatus =
        !statusFilter || debt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [debts, search, statusFilter]);

  const totalOriginal = debts.reduce(
    (sum, debt) => sum + Number(debt.original_amount),
    0,
  );

  const totalRemaining = debts.reduce(
    (sum, debt) => sum + Number(debt.remaining_amount),
    0,
  );

  const totalPaid = totalOriginal - totalRemaining;

  const activeCount = debts.filter(
    (debt) => debt.status === "active",
  ).length;

  const partialCount = debts.filter(
    (debt) => debt.status === "partially_paid",
  ).length;

  const paidCount = debts.filter(
    (debt) => debt.status === "paid",
  ).length;

  const openPayment = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount("");
    setPaymentComment("");
    setError("");
    setPaymentOpened(true);
  };

  const openHistory = (debt: Debt) => {
    setSelectedDebt(debt);
    setHistoryOpened(true);
  };

  const submitPayment = async () => {
    if (!selectedDebt) return;

    const amount = Number(paymentAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Введите корректную сумму оплаты.");
      return;
    }

    if (amount > Number(selectedDebt.remaining_amount)) {
      setError("Сумма оплаты превышает остаток долга.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.post(`/debts/${selectedDebt.id}/pay/`, {
        amount: amount.toFixed(2),
        comment: paymentComment,
      });

      setPaymentOpened(false);
      setSelectedDebt(null);

      await loadDebts();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const refreshSelectedDebt = async () => {
    if (!selectedDebt) return;

    try {
      const response = await api.get(`/debts/${selectedDebt.id}/`);
      setSelectedDebt(response.data as Debt);
    } catch {
      // История остаётся доступной из ранее загруженных данных.
    }
  };

  const completionPercent = (debt: Debt) => {
    const original = Number(debt.original_amount);

    if (original <= 0) return 0;

    return Math.min(
      100,
      Math.max(
        0,
        ((original - Number(debt.remaining_amount)) / original) * 100,
      ),
    );
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Задолженности</Title>
          <Text c="dimmed" size="sm">
            Управление долгами и поступлениями от клиентов
          </Text>
        </div>

        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={() => void loadDebts()}
          loading={loading}
        >
          Обновить
        </Button>
      </Group>

      {error && (
        <Card withBorder>
          <Text c="red" size="sm" style={{ whiteSpace: "pre-wrap" }}>
            {error}
          </Text>
        </Card>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Первоначальные долги</Text>
            <IconWallet size={22} />
          </Group>
          <Title order={2} mt="sm">{money(totalOriginal)}</Title>
          <Text size="xs" c="dimmed">Общая сумма задолженностей</Text>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Остаток долгов</Text>
            <IconCash size={22} />
          </Group>
          <Title order={2} mt="sm" c="red">
            {money(totalRemaining)}
          </Title>
          <Text size="xs" c="dimmed">Ещё не оплачено</Text>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Получено оплат</Text>
            <IconCash size={22} />
          </Group>
          <Title order={2} mt="sm" c="green">
            {money(totalPaid)}
          </Title>
          <Text size="xs" c="dimmed">Погашенная сумма</Text>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Количество долгов</Text>
            <IconHistory size={22} />
          </Group>
          <Title order={2} mt="sm">{debts.length}</Title>
          <Group gap="xs" mt="xs">
            <Badge color="red">{activeCount} активных</Badge>
            <Badge color="yellow">{partialCount} частичных</Badge>
            <Badge color="green">{paidCount} оплачено</Badge>
          </Group>
        </Card>
      </SimpleGrid>

      <Card withBorder>
        <Group grow align="end">
          <TextInput
            label="Поиск"
            placeholder="Клиент, ID долга или продажи"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />

          <Select
            label="Статус"
            placeholder="Все статусы"
            clearable
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            data={[
              { value: "active", label: "Активный" },
              { value: "partially_paid", label: "Частично оплачен" },
              { value: "paid", label: "Оплачен" },
            ]}
          />
        </Group>
      </Card>

      <Card withBorder>
        {loading ? (
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        ) : (
          <Table.ScrollContainer minWidth={1050}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Клиент</Table.Th>
                  <Table.Th>Продажа</Table.Th>
                  <Table.Th>Первоначальная сумма</Table.Th>
                  <Table.Th>Оплачено</Table.Th>
                  <Table.Th>Остаток</Table.Th>
                  <Table.Th>Прогресс</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredDebts.map((debt) => {
                  const status = statusInfo(debt.status);
                  const paid =
                    Number(debt.original_amount) -
                    Number(debt.remaining_amount);

                  return (
                    <Table.Tr key={debt.id}>
                      <Table.Td>#{debt.id}</Table.Td>

                      <Table.Td>
                        <Text fw={500}>
                          {debt.customer_name || `Клиент #${debt.customer}`}
                        </Text>
                      </Table.Td>

                      <Table.Td>#{debt.sale}</Table.Td>

                      <Table.Td>
                        {money(debt.original_amount)}
                      </Table.Td>

                      <Table.Td c="green">
                        {money(paid)}
                      </Table.Td>

                      <Table.Td>
                        <Text fw={600} c={Number(debt.remaining_amount) > 0 ? "red" : "green"}>
                          {money(debt.remaining_amount)}
                        </Text>
                      </Table.Td>

                      <Table.Td miw={120}>
                        <Progress
                          value={completionPercent(debt)}
                          color={debt.status === "paid" ? "green" : "blue"}
                          size="md"
                        />
                        <Text size="xs" c="dimmed" mt={4}>
                          {completionPercent(debt).toFixed(0)}%
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        <Badge color={status.color}>
                          {status.label}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Group gap={5} wrap="nowrap">
                          {debt.status !== "paid" && (
                            <Tooltip label="Внести оплату">
                              <ActionIcon
                                color="green"
                                variant="light"
                                onClick={() => openPayment(debt)}
                              >
                                <IconCash size={17} />
                              </ActionIcon>
                            </Tooltip>
                          )}

                          <Tooltip label="История платежей">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => openHistory(debt)}
                            >
                              <IconHistory size={17} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                {filteredDebts.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={9}>
                      <Text c="dimmed" ta="center" py="xl">
                        Задолженности не найдены
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
        opened={paymentOpened}
        onClose={() => setPaymentOpened(false)}
        title="Внести оплату"
        centered
      >
        {selectedDebt && (
          <Stack>
            <Card withBorder>
              <Text size="sm" c="dimmed">Клиент</Text>
              <Text fw={600}>
                {selectedDebt.customer_name || `#${selectedDebt.customer}`}
              </Text>

              <Text size="sm" c="dimmed" mt="sm">
                Остаток задолженности
              </Text>
              <Title order={3} c="red">
                {money(selectedDebt.remaining_amount)}
              </Title>
            </Card>

            <NumberInput
              label="Сумма оплаты"
              placeholder="Введите сумму"
              min={0.01}
              max={Number(selectedDebt.remaining_amount)}
              decimalScale={2}
              value={paymentAmount}
              onChange={(value) => setPaymentAmount(value)}
              required
            />

            <Textarea
              label="Комментарий"
              placeholder="Например, оплата наличными"
              value={paymentComment}
              onChange={(event) =>
                setPaymentComment(event.currentTarget.value)
              }
            />

            {error && (
              <Text c="red" size="sm" style={{ whiteSpace: "pre-wrap" }}>
                {error}
              </Text>
            )}

            <Group justify="flex-end">
              <Button
                variant="default"
                onClick={() => setPaymentOpened(false)}
              >
                Отмена
              </Button>

              <Button
                color="green"
                loading={saving}
                onClick={() => void submitPayment()}
              >
                Подтвердить оплату
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <Modal
        opened={historyOpened}
        onClose={() => setHistoryOpened(false)}
        title="История платежей"
        centered
        size="lg"
      >
        {selectedDebt && (
          <Stack>
            <Group justify="space-between">
              <div>
                <Text fw={600}>
                  Долг #{selectedDebt.id}
                </Text>
                <Text size="sm" c="dimmed">
                  {selectedDebt.customer_name || `Клиент #${selectedDebt.customer}`}
                </Text>
              </div>

              <Button
                size="xs"
                variant="light"
                onClick={() => void refreshSelectedDebt()}
              >
                Обновить
              </Button>
            </Group>

            <SimpleGrid cols={2}>
              <Card withBorder>
                <Text size="xs" c="dimmed">Первоначальная сумма</Text>
                <Text fw={600}>
                  {money(selectedDebt.original_amount)}
                </Text>
              </Card>

              <Card withBorder>
                <Text size="xs" c="dimmed">Остаток</Text>
                <Text fw={600} c="red">
                  {money(selectedDebt.remaining_amount)}
                </Text>
              </Card>
            </SimpleGrid>

            <Title order={5}>Платежи</Title>

            {selectedDebt.payments.length === 0 ? (
              <Text c="dimmed" ta="center" py="lg">
                Платежей пока нет
              </Text>
            ) : (
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Дата</Table.Th>
                    <Table.Th>Сумма</Table.Th>
                    <Table.Th>Комментарий</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {selectedDebt.payments.map((payment) => (
                    <Table.Tr key={payment.id}>
                      <Table.Td>
                        {formatDate(payment.created_at)}
                      </Table.Td>
                      <Table.Td>
                        <Text c="green" fw={600}>
                          {money(payment.amount)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        {payment.comment || "—"}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

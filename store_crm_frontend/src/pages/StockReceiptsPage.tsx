
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  ActionIcon,
  ScrollArea,
  Divider,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconTrash,
  IconEdit,
  IconClipboardList,
  IconX,
} from "@tabler/icons-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../api/client";

// -------------------- TYPES --------------------

interface Warehouse {
  id: number;
  name: string;
  branch_name?: string;
}

interface Product {
  id: number;
  name: string;
  sku?: string;
  barcode?: string;
  purchase_price: string | number;
  sale_price: string | number;
  is_active: boolean;
}

interface ReceiptItem {
  id?: number;
  product: number;
  product_name?: string;
  quantity: string | number;
  unit_cost: string | number;
}

interface Receipt {
  id: number;
  warehouse: number;
  warehouse_name: string;
  document_number: string;
  status: "draft" | "completed" | "cancelled";
  comment: string;
  created_at: string;
  completed_at: string | null;
  items: ReceiptItem[];
}

interface ReceiptLine {
  product: string | null;
  quantity: string;
  unit_cost: string;
}

// -------------------- HELPERS --------------------

function getList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (typeof data === "object" && data !== null) {
    const object = data as Record<string, unknown>;

    if (Array.isArray(object.results)) {
      return object.results as T[];
    }

    if (Array.isArray(object.data)) {
      return object.data as T[];
    }
  }

  return [];
}

function getApiError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: Record<string, unknown>;
        };
      }
    ).response;

    const data = response?.data;

    if (data) {
      if (typeof data.detail === "string") {
        return data.detail;
      }

      const firstField = Object.entries(data)[0];

      if (firstField) {
        const value = firstField[1];

        if (Array.isArray(value)) {
          return `${firstField[0]}: ${value.join(", ")}`;
        }

        if (typeof value === "object" && value !== null) {
          return `${firstField[0]}: ${JSON.stringify(value)}`;
        }

        return `${firstField[0]}: ${String(value)}`;
      }
    }
  }

  return "Не удалось выполнить запрос. Проверьте соединение с сервером.";
}

function formatMoney(value: string | number): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number)} сум`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatus(status: Receipt["status"]) {
  switch (status) {
    case "draft":
      return {
        label: "Черновик",
        color: "yellow",
      };

    case "completed":
      return {
        label: "Завершён",
        color: "green",
      };

    case "cancelled":
      return {
        label: "Отменён",
        color: "red",
      };
  }
}

function getReceiptTotal(receipt: Receipt): number {
  return receipt.items.reduce(
    (total, item) =>
      total +
      Number(item.quantity) * Number(item.unit_cost),
    0,
  );
}

// -------------------- COMPONENT --------------------

export default function StockReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [modalOpened, setModalOpened] = useState(false);
  const [selectedReceipt, setSelectedReceipt] =
    useState<Receipt | null>(null);

  const [warehouse, setWarehouse] = useState<string | null>(null);
  const [documentNumber, setDocumentNumber] = useState("");
  const [comment, setComment] = useState("");

  const [lines, setLines] = useState<ReceiptLine[]>([
    {
      product: null,
      quantity: "1",
      unit_cost: "0",
    },
  ]);

  // -------------------- LOAD DATA --------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [receiptsResponse, warehousesResponse, productsResponse] =
        await Promise.all([
          api.get("/stock-receipts/"),
          api.get("/warehouses/"),
          api.get("/products/"),
        ]);

      setReceipts(getList<Receipt>(receiptsResponse.data));
      setWarehouses(getList<Warehouse>(warehousesResponse.data));
      setProducts(getList<Product>(productsResponse.data));
    } catch (err: unknown) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // -------------------- FILTER --------------------

  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return receipts.filter((receipt) => {
      const matchesSearch =
        !query ||
        receipt.document_number.toLowerCase().includes(query) ||
        receipt.warehouse_name.toLowerCase().includes(query);

      const matchesStatus =
        !statusFilter || receipt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [receipts, search, statusFilter]);

  // -------------------- STATISTICS --------------------

  const statistics = useMemo(() => {
    return {
      total: receipts.length,
      drafts: receipts.filter((r) => r.status === "draft").length,
      completed: receipts.filter((r) => r.status === "completed").length,
      cancelled: receipts.filter((r) => r.status === "cancelled").length,
    };
  }, [receipts]);

  // -------------------- FORM --------------------

  function resetForm() {
    setSelectedReceipt(null);
    setWarehouse(null);
    setDocumentNumber("");
    setComment("");

    setLines([
      {
        product: null,
        quantity: "1",
        unit_cost: "0",
      },
    ]);

    setFormError("");
  }

  function openCreateModal() {
    resetForm();
    setModalOpened(true);
  }

  function openEditModal(receipt: Receipt) {
    setSelectedReceipt(receipt);

    setWarehouse(String(receipt.warehouse));
    setDocumentNumber(receipt.document_number);
    setComment(receipt.comment || "");

    setLines(
      receipt.items.map((item) => ({
        product: String(item.product),
        quantity: String(item.quantity),
        unit_cost: String(item.unit_cost),
      })),
    );

    setFormError("");
    setModalOpened(true);
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        product: null,
        quantity: "1",
        unit_cost: "0",
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.filter((_, i) => i !== index),
    );
  }

  function updateLine(
    index: number,
    field: keyof ReceiptLine,
    value: string | null,
  ) {
    setLines((current) =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  function handleProductChange(
    index: number,
    productId: string | null,
  ) {
    const product = products.find(
      (item) => String(item.id) === productId,
    );

    setLines((current) =>
      current.map((line, i) =>
        i === index
          ? {
              ...line,
              product: productId,
              unit_cost: product
                ? String(product.purchase_price)
                : "0",
            }
          : line,
      ),
    );
  }

  // -------------------- SAVE RECEIPT --------------------

  async function handleSave() {
    setFormError("");

    if (!warehouse) {
      setFormError("Выберите склад.");
      return;
    }

    if (!documentNumber.trim()) {
      setFormError("Введите номер документа.");
      return;
    }

    if (lines.length === 0) {
      setFormError("Добавьте хотя бы один товар.");
      return;
    }

    for (const line of lines) {
      if (!line.product) {
        setFormError("Выберите товар во всех строках.");
        return;
      }

      if (
        !Number.isFinite(Number(line.quantity)) ||
        Number(line.quantity) <= 0
      ) {
        setFormError("Количество товара должно быть больше нуля.");
        return;
      }

      if (
        !Number.isFinite(Number(line.unit_cost)) ||
        Number(line.unit_cost) < 0
      ) {
        setFormError("Закупочная цена не может быть отрицательной.");
        return;
      }
    }

    const productIds = lines.map((line) => line.product);

    if (new Set(productIds).size !== productIds.length) {
      setFormError("Один товар нельзя добавлять несколько раз. Измените количество в его строке.");
      return;
    }

    const payload = {
      warehouse: Number(warehouse),
      document_number: documentNumber.trim(),
      comment,
      items: lines.map((line) => ({
        product: Number(line.product),
        quantity: Number(line.quantity),
        unit_cost: Number(line.unit_cost),
      })),
    };

    setSaving(true);

    try {
      if (selectedReceipt) {
        await api.patch(
          `/stock-receipts/${selectedReceipt.id}/`,
          payload,
        );
      } else {
        await api.post("/stock-receipts/", payload);
      }

      setModalOpened(false);
      resetForm();

      await loadData();
    } catch (err: unknown) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  // -------------------- COMPLETE --------------------

  async function handleComplete(receipt: Receipt) {
    const confirmed = window.confirm(
      `Завершить приёмку "${receipt.document_number}"?\n\nКоличество товаров на складе будет увеличено.`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.post(
        `/stock-receipts/${receipt.id}/complete/`,
      );

      await loadData();
    } catch (err: unknown) {
      setError(getApiError(err));
    }
  }

  // -------------------- CANCEL --------------------

  async function handleCancel(receipt: Receipt) {
    const confirmed = window.confirm(
      `Отменить приёмку "${receipt.document_number}"?`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.post(
        `/stock-receipts/${receipt.id}/cancel/`,
      );

      await loadData();
    } catch (err: unknown) {
      setError(getApiError(err));
    }
  }

  // -------------------- DELETE --------------------

  async function handleDelete(receipt: Receipt) {
    const confirmed = window.confirm(
      `Удалить черновик "${receipt.document_number}"?`,
    );

    if (!confirmed) return;

    setError("");

    try {
      await api.delete(
        `/stock-receipts/${receipt.id}/`,
      );

      await loadData();
    } catch (err: unknown) {
      setError(getApiError(err));
    }
  }

  // -------------------- PRODUCT OPTIONS --------------------

  const productOptions = products
    .filter((product) => product.is_active)
    .map((product) => ({
      value: String(product.id),
      label: product.sku
        ? `${product.name} (${product.sku})`
        : product.name,
    }));

  const warehouseOptions = warehouses.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  // -------------------- RENDER --------------------

  return (
    <Stack gap="lg">

      {/* HEADER */}

      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Приёмка товаров</Title>

          <Text c="dimmed" size="sm" mt={4}>
            Создание документов поступления товаров на склад
          </Text>
        </div>

        <Group>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void loadData()}
            loading={loading}
          >
            Обновить
          </Button>

          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreateModal}
          >
            Новая приёмка
          </Button>
        </Group>
      </Group>

      {/* ERROR */}

      {error && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          withCloseButton
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* STATISTICS */}

      <Group grow align="stretch">
        <Card withBorder radius="lg">
          <Text size="sm" c="dimmed">
            Всего документов
          </Text>
          <Title order={2}>{statistics.total}</Title>
        </Card>

        <Card withBorder radius="lg">
          <Text size="sm" c="dimmed">
            Черновики
          </Text>
          <Title order={2} c="yellow">
            {statistics.drafts}
          </Title>
        </Card>

        <Card withBorder radius="lg">
          <Text size="sm" c="dimmed">
            Завершённые
          </Text>
          <Title order={2} c="green">
            {statistics.completed}
          </Title>
        </Card>

        <Card withBorder radius="lg">
          <Text size="sm" c="dimmed">
            Отменённые
          </Text>
          <Title order={2} c="red">
            {statistics.cancelled}
          </Title>
        </Card>
      </Group>

      {/* RECEIPTS TABLE */}

      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconClipboardList size={21} />
            <Title order={4}>Документы приёмки</Title>
          </Group>

          <Badge size="lg" variant="light">
            {filteredReceipts.length} документов
          </Badge>
        </Group>

        <Group mb="md" grow>
          <TextInput
            placeholder="Поиск по номеру документа или складу"
            value={search}
            onChange={(event) =>
              setSearch(event.currentTarget.value)
            }
          />

          <Select
            placeholder="Все статусы"
            clearable
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            data={[
              { value: "draft", label: "Черновик" },
              { value: "completed", label: "Завершён" },
              { value: "cancelled", label: "Отменён" },
            ]}
          />
        </Group>

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
            <Text c="dimmed">Загрузка документов...</Text>
          </Group>
        ) : (
          <ScrollArea>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              miw={1050}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Документ</Table.Th>
                  <Table.Th>Склад</Table.Th>
                  <Table.Th>Товаров</Table.Th>
                  <Table.Th>Сумма</Table.Th>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredReceipts.map((receipt) => {
                  const status = getStatus(receipt.status);

                  return (
                    <Table.Tr key={receipt.id}>
                      <Table.Td>{receipt.id}</Table.Td>

                      <Table.Td>
                        <Text fw={600}>
                          {receipt.document_number}
                        </Text>
                      </Table.Td>

                      <Table.Td>
                        {receipt.warehouse_name}
                      </Table.Td>

                      <Table.Td>
                        {receipt.items.length}
                      </Table.Td>

                      <Table.Td>
                        {formatMoney(getReceiptTotal(receipt))}
                      </Table.Td>

                      <Table.Td>
                        {formatDate(receipt.created_at)}
                      </Table.Td>

                      <Table.Td>
                        <Badge color={status.color} variant="light">
                          {status.label}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Group gap={5} wrap="nowrap">

                          {receipt.status === "draft" && (
                            <>
                              <ActionIcon
                                color="blue"
                                variant="light"
                                title="Редактировать"
                                onClick={() =>
                                  openEditModal(receipt)
                                }
                              >
                                <IconEdit size={17} />
                              </ActionIcon>

                              <ActionIcon
                                color="green"
                                variant="light"
                                title="Завершить"
                                onClick={() =>
                                  void handleComplete(receipt)
                                }
                              >
                                <IconCheck size={17} />
                              </ActionIcon>

                              <ActionIcon
                                color="yellow"
                                variant="light"
                                title="Отменить"
                                onClick={() =>
                                  void handleCancel(receipt)
                                }
                              >
                                <IconX size={17} />
                              </ActionIcon>

                              <ActionIcon
                                color="red"
                                variant="light"
                                title="Удалить"
                                onClick={() =>
                                  void handleDelete(receipt)
                                }
                              >
                                <IconTrash size={17} />
                              </ActionIcon>
                            </>
                          )}

                          {receipt.status !== "draft" && (
                            <Text size="xs" c="dimmed">
                              Нет действий
                            </Text>
                          )}

                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                {filteredReceipts.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text c="dimmed" ta="center" py="xl">
                        Документы не найдены.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      {/* CREATE / EDIT MODAL */}

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          resetForm();
        }}
        title={
          <Title order={4}>
            {selectedReceipt
              ? "Редактирование приёмки"
              : "Новая приёмка"}
          </Title>
        }
        size="xl"
        centered
      >
        <Stack gap="md">

          {formError && (
            <Alert color="red" icon={<IconAlertTriangle size={18} />}>
              {formError}
            </Alert>
          )}

          <Select
            label="Склад"
            placeholder="Выберите склад"
            data={warehouseOptions}
            value={warehouse}
            onChange={(value) => setWarehouse(value)}
            searchable
            required
          />

          <TextInput
            label="Номер документа"
            placeholder="Например: REC-001"
            value={documentNumber}
            onChange={(event) =>
              setDocumentNumber(event.currentTarget.value)
            }
            required
          />

          <Textarea
            label="Комментарий"
            placeholder="Дополнительная информация..."
            value={comment}
            onChange={(event) =>
              setComment(event.currentTarget.value)
            }
            minRows={2}
          />

          <Divider />

          <Group justify="space-between">
            <Title order={5}>Товары в документе</Title>

            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={15} />}
              onClick={addLine}
            >
              Добавить товар
            </Button>
          </Group>

          {lines.map((line, index) => (
            <Card
              key={index}
              withBorder
              radius="md"
              padding="sm"
            >
              <Group align="flex-end" wrap="nowrap">

                <Select
                  style={{ flex: 3 }}
                  label={index === 0 ? "Товар" : undefined}
                  placeholder="Выберите товар"
                  data={productOptions}
                  value={line.product}
                  onChange={(value) =>
                    handleProductChange(index, value)
                  }
                  searchable
                  nothingFoundMessage="Товары не найдены"
                />

                <NumberInput
                  style={{ flex: 1 }}
                  label={index === 0 ? "Количество" : undefined}
                  min={0.001}
                  decimalScale={3}
                  step={1}
                  value={line.quantity}
                  onChange={(value) =>
                    updateLine(index, "quantity", String(value))
                  }
                />

                <NumberInput
                  style={{ flex: 1 }}
                  label={index === 0 ? "Цена закупки" : undefined}
                  min={0}
                  decimalScale={2}
                  value={line.unit_cost}
                  onChange={(value) =>
                    updateLine(index, "unit_cost", String(value))
                  }
                />

                <ActionIcon
                  color="red"
                  variant="light"
                  size="lg"
                  mb={4}
                  disabled={lines.length === 1}
                  onClick={() => removeLine(index)}
                  title="Удалить строку"
                >
                  <IconTrash size={17} />
                </ActionIcon>

              </Group>
            </Card>
          ))}

          <Divider />

          <Group justify="space-between">
            <Text fw={600}>
              Итого:
            </Text>

            <Title order={4} c="blue">
              {formatMoney(
                lines.reduce(
                  (total, line) =>
                    total +
                    Number(line.quantity || 0) *
                    Number(line.unit_cost || 0),
                  0,
                ),
              )}
            </Title>
          </Group>

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                setModalOpened(false);
                resetForm();
              }}
            >
              Закрыть
            </Button>

            <Button
              leftSection={<IconCheck size={16} />}
              onClick={() => void handleSave()}
              loading={saving}
            >
              Сохранить черновик
            </Button>
          </Group>

        </Stack>
      </Modal>

    </Stack>
  );
}

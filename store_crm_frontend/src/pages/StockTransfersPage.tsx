import { useCallback, useEffect, useMemo, useState } from "react";
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
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
} from "@mantine/core";
import {
  IconArrowsExchange,
  IconCheck,
  IconClipboardList,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconX,
} from "@tabler/icons-react";

import api from "../api/client";

interface Warehouse {
  id: number;
  name: string;
  branch_name?: string;
}

interface Product {
  id: number;
  name: string;
  barcode?: string;
  sku?: string;
  is_active: boolean;
}

interface Stock {
  id: number;
  warehouse: number;
  product: number;
  product_name: string;
  quantity: string;
  reserved_quantity: string;
  available_quantity: string;
}

interface TransferItem {
  id?: number;
  product: number;
  product_name?: string;
  quantity: string;
}

interface Transfer {
  id: number;
  source_warehouse: number;
  source_warehouse_name?: string;
  destination_warehouse: number;
  destination_warehouse_name?: string;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  comment: string;
  created_by_name?: string;
  created_at: string;
  completed_at: string | null;
  items: TransferItem[];
}

interface TransferLine {
  product: string;
  quantity: string;
}

interface ApiError {
  response?: {
    data?: unknown;
  };
}

function getList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object") {
    const result = data as {
      results?: T[];
      data?: T[];
    };

    if (Array.isArray(result.results)) {
      return result.results;
    }

    if (Array.isArray(result.data)) {
      return result.data;
    }
  }

  return [];
}

function getApiError(error: unknown): string {
  const apiError = error as ApiError;
  const data = apiError.response?.data;

  if (typeof data === "string") {
    return data;
  }

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    if (typeof object.detail === "string") {
      return object.detail;
    }

    if (typeof object.message === "string") {
      return object.message;
    }

    return Object.entries(object)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(", ")}`;
        }

        if (typeof value === "string") {
          return `${key}: ${value}`;
        }

        return `${key}: ${JSON.stringify(value)}`;
      })
      .join("\n");
  }

  return "Произошла неизвестная ошибка.";
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  return new Date(value).toLocaleString("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getStatus(status: Transfer["status"]) {
  const statuses = {
    draft: {
      label: "Черновик",
      color: "gray",
    },
    in_progress: {
      label: "В процессе",
      color: "blue",
    },
    completed: {
      label: "Завершено",
      color: "green",
    },
    cancelled: {
      label: "Отменено",
      color: "red",
    },
  } as const;

  return statuses[status];
}

function getTransferQuantity(items: TransferItem[]): number {
  return items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  );
}

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("all");

  const [modalOpened, setModalOpened] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(
    null,
  );

  const [sourceWarehouse, setSourceWarehouse] = useState<string | null>(null);
  const [destinationWarehouse, setDestinationWarehouse] =
    useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState<TransferLine[]>([
    { product: "", quantity: "1" },
  ]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [transfersResponse, warehousesResponse, productsResponse] =
        await Promise.all([
          api.get("/stock-transfers/"),
          api.get("/warehouses/"),
          api.get("/products/"),
        ]);

      setTransfers(getList<Transfer>(transfersResponse.data));
      setWarehouses(getList<Warehouse>(warehousesResponse.data));
      setProducts(
        getList<Product>(productsResponse.data).filter(
          (product) => product.is_active,
        ),
      );
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSourceStock = useCallback(async (warehouseId: string | null) => {
    if (!warehouseId) {
      setStocks([]);
      return;
    }

    try {
      const response = await api.get("/stock/", {
        params: {
          warehouse: warehouseId,
        },
      });

      setStocks(getList<Stock>(response.data));
    } catch (requestError) {
      setStocks([]);
      setError(getApiError(requestError));
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadSourceStock(sourceWarehouse);
  }, [sourceWarehouse, loadSourceStock]);

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.branch_name
          ? `${warehouse.name} — ${warehouse.branch_name}`
          : warehouse.name,
      })),
    [warehouses],
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product.id),
        label: product.sku
          ? `${product.name} (${product.sku})`
          : product.name,
      })),
    [products],
  );

  const availableStockByProduct = useMemo(() => {
    const result = new Map<number, number>();

    stocks.forEach((stock) => {
      result.set(stock.product, Number(stock.available_quantity));
    });

    return result;
  }, [stocks]);

  const filteredTransfers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return transfers.filter((transfer) => {
      const matchesStatus =
        !statusFilter ||
        statusFilter === "all" ||
        transfer.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        String(transfer.id).includes(normalizedSearch) ||
        (transfer.source_warehouse_name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (transfer.destination_warehouse_name || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        (transfer.comment || "").toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [transfers, search, statusFilter]);

  const stats = useMemo(
    () => ({
      total: transfers.length,
      draft: transfers.filter((item) => item.status === "draft").length,
      completed: transfers.filter((item) => item.status === "completed").length,
      cancelled: transfers.filter((item) => item.status === "cancelled").length,
    }),
    [transfers],
  );

  const resetForm = () => {
    setEditingTransfer(null);
    setSourceWarehouse(null);
    setDestinationWarehouse(null);
    setComment("");
    setLines([{ product: "", quantity: "1" }]);
    setStocks([]);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpened(true);
  };

  const openEditModal = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setSourceWarehouse(String(transfer.source_warehouse));
    setDestinationWarehouse(String(transfer.destination_warehouse));
    setComment(transfer.comment || "");
    setLines(
      transfer.items.length
        ? transfer.items.map((item) => ({
            product: String(item.product),
            quantity: String(item.quantity),
          }))
        : [{ product: "", quantity: "1" }],
    );
    setError("");
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    resetForm();
  };

  const addLine = () => {
    setLines((current) => [
      ...current,
      { product: "", quantity: "1" },
    ]);
  };

  const updateLine = (
    index: number,
    field: keyof TransferLine,
    value: string,
  ) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, [field]: value }
          : line,
      ),
    );
  };

  const removeLine = (index: number) => {
    setLines((current) => current.filter((_, i) => i !== index));
  };

  const saveTransfer = async () => {
    setError("");

    if (!sourceWarehouse || !destinationWarehouse) {
      setError("Выберите склад отправления и склад получения.");
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      setError("Склады отправления и получения должны отличаться.");
      return;
    }

    if (lines.length === 0) {
      setError("Добавьте хотя бы один товар.");
      return;
    }

    const invalidLine = lines.find(
      (line) =>
        !line.product ||
        !Number.isFinite(Number(line.quantity)) ||
        Number(line.quantity) <= 0,
    );

    if (invalidLine) {
      setError("Проверьте товары и количество в каждой строке.");
      return;
    }

    const productIds = lines.map((line) => line.product);

    if (new Set(productIds).size !== productIds.length) {
      setError("Один товар нельзя добавлять в документ несколько раз.");
      return;
    }

    for (const line of lines) {
      const available = availableStockByProduct.get(Number(line.product)) ?? 0;

      if (Number(line.quantity) > available) {
        const product = products.find(
          (item) => item.id === Number(line.product),
        );

        setError(
          `Недостаточно товара «${product?.name || line.product}» на складе. Доступно: ${available}.`,
        );
        return;
      }
    }

    const payload = {
      source_warehouse: Number(sourceWarehouse),
      destination_warehouse: Number(destinationWarehouse),
      comment,
      items: lines.map((line) => ({
        product: Number(line.product),
        quantity: line.quantity,
      })),
    };

    setSaving(true);

    try {
      if (editingTransfer) {
        await api.patch(
          `/stock-transfers/${editingTransfer.id}/`,
          payload,
        );
        setSuccess("Перемещение обновлено.");
      } else {
        await api.post("/stock-transfers/", payload);
        setSuccess("Документ перемещения создан.");
      }

      closeModal();
      await loadData();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const completeTransfer = async (transfer: Transfer) => {
    const confirmed = window.confirm(
      `Завершить перемещение №${transfer.id}? Остатки на обоих складах будут изменены.`,
    );

    if (!confirmed) return;

    setActionId(transfer.id);
    setError("");
    setSuccess("");

    try {
      await api.post(`/stock-transfers/${transfer.id}/complete/`);
      setSuccess(`Перемещение №${transfer.id} завершено.`);
      await loadData();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setActionId(null);
    }
  };

  const cancelTransfer = async (transfer: Transfer) => {
    const confirmed = window.confirm(
      `Отменить черновик перемещения №${transfer.id}?`,
    );

    if (!confirmed) return;

    setActionId(transfer.id);
    setError("");
    setSuccess("");

    try {
      await api.post(`/stock-transfers/${transfer.id}/cancel/`);
      setSuccess(`Перемещение №${transfer.id} отменено.`);
      await loadData();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setActionId(null);
    }
  };

  const deleteTransfer = async (transfer: Transfer) => {
    const confirmed = window.confirm(
      `Удалить черновик перемещения №${transfer.id}?`,
    );

    if (!confirmed) return;

    setActionId(transfer.id);
    setError("");
    setSuccess("");

    try {
      await api.delete(`/stock-transfers/${transfer.id}/`);
      setSuccess(`Перемещение №${transfer.id} удалено.`);
      await loadData();
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setActionId(null);
    }
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Перемещения товаров</Title>
          <Text c="dimmed" size="sm">
            Перемещение товаров между складами компании
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
            Создать перемещение
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
          {error}
        </Alert>
      )}

      {success && (
        <Alert
          color="green"
          title="Готово"
          withCloseButton
          onClose={() => setSuccess("")}
        >
          {success}
        </Alert>
      )}

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Всего документов</Text>
            <IconClipboardList size={20} />
          </Group>
          <Title order={2}>{stats.total}</Title>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Черновики</Text>
            <IconArrowsExchange size={20} />
          </Group>
          <Title order={2}>{stats.draft}</Title>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Завершено</Text>
            <IconCheck size={20} />
          </Group>
          <Title order={2} c="green">{stats.completed}</Title>
        </Card>

        <Card withBorder>
          <Group justify="space-between">
            <Text c="dimmed" size="sm">Отменено</Text>
            <IconX size={20} />
          </Group>
          <Title order={2} c="red">{stats.cancelled}</Title>
        </Card>
      </SimpleGrid>

      <Card withBorder>
        <Group grow align="end">
          <TextInput
            label="Поиск"
            placeholder="Номер, склад или комментарий..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />

          <Select
            label="Статус"
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            data={[
              { value: "all", label: "Все статусы" },
              { value: "draft", label: "Черновик" },
              { value: "in_progress", label: "В процессе" },
              { value: "completed", label: "Завершено" },
              { value: "cancelled", label: "Отменено" },
            ]}
            allowDeselect={false}
          />
        </Group>
      </Card>

      <Card withBorder>
        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : filteredTransfers.length === 0 ? (
          <Stack align="center" py="xl" gap="xs">
            <IconArrowsExchange size={36} color="gray" />
            <Text fw={500}>Перемещений пока нет</Text>
            <Text size="sm" c="dimmed">
              Создайте первый документ перемещения.
            </Text>
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth={950}>
            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>№</Table.Th>
                  <Table.Th>Откуда</Table.Th>
                  <Table.Th>Куда</Table.Th>
                  <Table.Th>Товары</Table.Th>
                  <Table.Th>Количество</Table.Th>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredTransfers.map((transfer) => {
                  const status = getStatus(transfer.status);
                  const isDraft = transfer.status === "draft";
                  const busy = actionId === transfer.id;

                  return (
                    <Table.Tr key={transfer.id}>
                      <Table.Td>
                        <Text fw={600}>#{transfer.id}</Text>
                      </Table.Td>

                      <Table.Td>
                        {transfer.source_warehouse_name ||
                          `Склад #${transfer.source_warehouse}`}
                      </Table.Td>

                      <Table.Td>
                        {transfer.destination_warehouse_name ||
                          `Склад #${transfer.destination_warehouse}`}
                      </Table.Td>

                      <Table.Td>
                        {transfer.items.length}
                      </Table.Td>

                      <Table.Td>
                        {getTransferQuantity(transfer.items).toLocaleString(
                          "ru-RU",
                        )}
                      </Table.Td>

                      <Table.Td>
                        {formatDate(transfer.created_at)}
                      </Table.Td>

                      <Table.Td>
                        <Badge color={status.color}>
                          {status.label}
                        </Badge>
                      </Table.Td>

                      <Table.Td>
                        <Group gap={4} wrap="nowrap">
                          {isDraft && (
                            <>
                              <Button
                                size="xs"
                                variant="light"
                                onClick={() => openEditModal(transfer)}
                              >
                                Изменить
                              </Button>

                              <Button
                                size="xs"
                                color="green"
                                variant="light"
                                onClick={() => void completeTransfer(transfer)}
                                loading={busy}
                              >
                                <IconCheck size={15} />
                              </Button>

                              <Button
                                size="xs"
                                color="red"
                                variant="subtle"
                                onClick={() => void cancelTransfer(transfer)}
                                disabled={busy}
                              >
                                <IconX size={15} />
                              </Button>

                              <Button
                                size="xs"
                                color="red"
                                variant="subtle"
                                onClick={() => void deleteTransfer(transfer)}
                                disabled={busy}
                              >
                                <IconTrash size={15} />
                              </Button>
                            </>
                          )}

                          {transfer.status === "in_progress" && (
                            <Button
                              size="xs"
                              color="green"
                              onClick={() => void completeTransfer(transfer)}
                              loading={busy}
                            >
                              Завершить
                            </Button>
                          )}

                          {!isDraft &&
                            transfer.status !== "in_progress" && (
                              <Text size="xs" c="dimmed">
                                Нет действий
                              </Text>
                            )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          editingTransfer
            ? `Редактирование перемещения №${editingTransfer.id}`
            : "Новое перемещение товаров"
        }
        size="xl"
        centered
      >
        <Stack gap="md">
          {error && (
            <Alert color="red" title="Проверьте данные">
              {error}
            </Alert>
          )}

          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Склад отправления"
              placeholder="Выберите склад"
              data={warehouseOptions}
              value={sourceWarehouse}
              onChange={(value) => {
                setSourceWarehouse(value);
                setLines([{ product: "", quantity: "1" }]);
              }}
              searchable
              required
            />

            <Select
              label="Склад получения"
              placeholder="Выберите склад"
              data={warehouseOptions.filter(
                (option) => option.value !== sourceWarehouse,
              )}
              value={destinationWarehouse}
              onChange={(value) => setDestinationWarehouse(value)}
              searchable
              required
            />
          </SimpleGrid>

          {sourceWarehouse && (
            <Text size="sm" c="dimmed">
              Доступные остатки загружаются для выбранного склада отправления.
            </Text>
          )}

          <Group justify="space-between">
            <Text fw={600}>Товары для перемещения</Text>

            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
              onClick={addLine}
              disabled={!sourceWarehouse}
            >
              Добавить товар
            </Button>
          </Group>

          {lines.map((line, index) => {
            const selectedProduct = Number(line.product);
            const available =
              availableStockByProduct.get(selectedProduct) ?? 0;

            return (
              <Card key={index} withBorder padding="sm">
                <Group align="end" wrap="nowrap">
                  <Select
                    style={{ flex: 3 }}
                    label={index === 0 ? "Товар" : undefined}
                    placeholder="Выберите товар"
                    data={productOptions.filter(
                      (option) =>
                        !lines.some(
                          (otherLine, otherIndex) =>
                            otherIndex !== index &&
                            otherLine.product === option.value,
                        ),
                    )}
                    value={line.product || null}
                    onChange={(value) =>
                      updateLine(index, "product", value || "")
                    }
                    searchable
                    disabled={!sourceWarehouse}
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

                  <Button
                    color="red"
                    variant="subtle"
                    disabled={lines.length === 1}
                    onClick={() => removeLine(index)}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>

                {line.product && (
                  <Text size="xs" c="dimmed" mt="xs">
                    Доступно на складе: {available.toLocaleString("ru-RU")}
                  </Text>
                )}
              </Card>
            );
          })}

          <Textarea
            label="Комментарий"
            placeholder="Причина или примечание к перемещению..."
            value={comment}
            onChange={(event) => setComment(event.currentTarget.value)}
            minRows={2}
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              Отмена
            </Button>

            <Button
              onClick={() => void saveTransfer()}
              loading={saving}
              disabled={!warehouses.length || !products.length}
            >
              {editingTransfer ? "Сохранить изменения" : "Создать документ"}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
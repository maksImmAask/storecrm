
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconCheck,
  IconEye,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";
import api from "../api/client";

type ApiObject = Record<string, unknown> & {
  id: number | string;
};

interface SaleItem {
  id: number;
  product: number;
  product_name?: string;
  quantity: string | number;
  unit_price?: string | number;
  line_total?: string | number;
}

interface Sale {
  id: number;
  status: string;
  created_at: string;
  total_amount?: string | number;
  items: SaleItem[];
}

interface Warehouse {
  id: number;
  name: string;
}

interface ReturnItem {
  id: number;
  sale_item: number;
  quantity: string | number;
}

interface SaleReturn {
  id: number;
  sale: number;
  sale_number?: number;
  warehouse: number;
  status: string;
  reason: string;
  created_at: string;
  completed_at: string | null;
  items: ReturnItem[];
}

interface ReturnLine {
  sale_item: number;
  product_name: string;
  sold_quantity: number;
  quantity: number;
}

function getArray(data: unknown): ApiObject[] {
  if (Array.isArray(data)) {
    return data as ApiObject[];
  }

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    for (const key of ["results", "data", "items"]) {
      if (Array.isArray(object[key])) {
        return object[key] as ApiObject[];
      }
    }
  }

  return [];
}

function getError(error: unknown): string {
  const e = error as {
    response?: { data?: unknown };
    message?: string;
  };

  const data = e.response?.data;

  if (typeof data === "string") return data;

  if (data && typeof data === "object") {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) => {
        const message = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "string"
            ? value
            : JSON.stringify(value);

        return `${key}: ${message}`;
      })
      .join(" | ");
  }

  return e.message || "Неизвестная ошибка";
}

function getStatusColor(status: string): string {
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "yellow";
}

function getStatusLabel(status: string): string {
  if (status === "completed") return "Завершён";
  if (status === "draft") return "Черновик";
  if (status === "cancelled") return "Отменён";
  return status;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("ru-RU");
}

function getRelationId(value: unknown): string {
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return String(object.id ?? "");
  }

  return String(value ?? "");
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState<SaleReturn[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>("all");

  const [createOpened, setCreateOpened] = useState(false);
  const [detailsOpened, setDetailsOpened] = useState(false);

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);

  const [selectedReturn, setSelectedReturn] = useState<SaleReturn | null>(
    null,
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [returnsResponse, salesResponse, warehousesResponse] =
        await Promise.all([
          api.get("/sale-returns/"),
          api.get("/sales/"),
          api.get("/warehouses/"),
        ]);

      setReturns(getArray(returnsResponse.data) as unknown as SaleReturn[]);
      setSales(getArray(salesResponse.data) as unknown as Sale[]);
      setWarehouses(
        getArray(warehousesResponse.data) as unknown as Warehouse[],
      );
    } catch (e) {
      setError(getError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const completedSales = useMemo(
    () => sales.filter((sale) => sale.status === "completed"),
    [sales],
  );

  const saleOptions = useMemo(
    () =>
      completedSales.map((sale) => ({
        value: String(sale.id),
        label: `Продажа #${sale.id} — ${formatDate(sale.created_at)}`,
      })),
    [completedSales],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: String(warehouse.id),
        label: warehouse.name || `Склад #${warehouse.id}`,
      })),
    [warehouses],
  );

  const filteredReturns = useMemo(() => {
    const query = search.toLowerCase().trim();

    return returns.filter((item) => {
      const matchesStatus =
        !statusFilter ||
        statusFilter === "all" ||
        item.status === statusFilter;

      const matchesSearch =
        !query ||
        [
          item.id,
          item.sale_number ?? item.sale,
          item.status,
          item.reason,
          item.warehouse,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [returns, search, statusFilter]);

  function resetForm() {
    setSelectedSaleId(null);
    setSelectedWarehouse(null);
    setReason("");
    setReturnLines([]);
    setError("");
  }

  function openCreateModal() {
    resetForm();
    setCreateOpened(true);
  }

  function handleSaleChange(value: string | null) {
    setSelectedSaleId(value);

    const sale = completedSales.find(
      (item) => String(item.id) === value,
    );

    if (!sale) {
      setReturnLines([]);
      return;
    }

    setReturnLines(
      (sale.items || []).map((item) => ({
        sale_item: item.id,
        product_name: item.product_name || `Товар #${item.product}`,
        sold_quantity: Number(item.quantity),
        quantity: 0,
      })),
    );
  }

  function updateReturnQuantity(index: number, value: number) {
    setReturnLines((previous) =>
      previous.map((item, i) =>
        i === index
          ? {
              ...item,
              quantity: Math.min(
                Math.max(0, value),
                item.sold_quantity,
              ),
            }
          : item,
      ),
    );
  }

  async function createReturn() {
    setError("");

    if (!selectedSaleId) {
      setError("Выберите продажу.");
      return;
    }

    if (!selectedWarehouse) {
      setError("Выберите склад для возврата.");
      return;
    }

    const items = returnLines
      .filter((item) => item.quantity > 0)
      .map((item) => ({
        sale_item: item.sale_item,
        quantity: item.quantity,
      }));

    if (items.length === 0) {
      setError("Укажите количество хотя бы одного возвращаемого товара.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/sale-returns/", {
        sale: Number(selectedSaleId),
        warehouse: Number(selectedWarehouse),
        reason,
        items,
      });

      setCreateOpened(false);
      resetForm();
      await loadData();
    } catch (e) {
      setError(getError(e));
    } finally {
      setSaving(false);
    }
  }

  async function completeReturn(returnId: number) {
    const confirmed = window.confirm(
      `Завершить возврат #${returnId}? Товары будут добавлены на склад.`,
    );

    if (!confirmed) return;

    setActionLoading(returnId);
    setError("");

    try {
      await api.post(`/sale-returns/${returnId}/complete/`);
      setDetailsOpened(false);
      setSelectedReturn(null);
      await loadData();
    } catch (e) {
      setError(getError(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteReturn(returnId: number) {
    const confirmed = window.confirm(
      `Удалить черновик возврата #${returnId}?`,
    );

    if (!confirmed) return;

    setActionLoading(returnId);
    setError("");

    try {
      await api.delete(`/sale-returns/${returnId}/`);
      setDetailsOpened(false);
      setSelectedReturn(null);
      await loadData();
    } catch (e) {
      setError(getError(e));
    } finally {
      setActionLoading(null);
    }
  }

  function openDetails(item: SaleReturn) {
    setSelectedReturn(item);
    setDetailsOpened(true);
  }

  const selectedSale = completedSales.find(
    (sale) => String(sale.id) === selectedSaleId,
  );

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Возвраты</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Управление возвратами товаров и их статусами.
          </Text>
        </div>

        <Group>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void loadData()}
          >
            Обновить
          </Button>

          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreateModal}
          >
            Новый возврат
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      )}

      <Card withBorder radius="md" padding="md">
        <Group grow align="flex-end" mb="md">
          <TextInput
            label="Поиск"
            placeholder="Номер возврата, продажи или причина..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />

          <Select
            label="Статус"
            data={[
              { value: "all", label: "Все статусы" },
              { value: "draft", label: "Черновики" },
              { value: "completed", label: "Завершённые" },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value ?? "")}
            clearable
          />
        </Group>

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover miw={850}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>№ возврата</Table.Th>
                  <Table.Th>№ продажи</Table.Th>
                  <Table.Th>Склад</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Причина</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredReturns.map((item) => {
                  const warehouse = warehouses.find(
                    (w) => String(w.id) === getRelationId(item.warehouse),
                  );

                  return (
                    <Table.Tr key={item.id}>
                      <Table.Td>#{item.id}</Table.Td>
                      <Table.Td>
                        #{item.sale_number ?? getRelationId(item.sale)}
                      </Table.Td>
                      <Table.Td>
                        {warehouse?.name ||
                          `Склад #${getRelationId(item.warehouse)}`}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={getStatusColor(item.status)}>
                          {getStatusLabel(item.status)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatDate(item.created_at)}</Table.Td>
                      <Table.Td>
                        <Text size="sm" lineClamp={1}>
                          {item.reason || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <ActionIcon
                            variant="light"
                            color="blue"
                            onClick={() => openDetails(item)}
                            aria-label="Открыть возврат"
                          >
                            <IconEye size={16} />
                          </ActionIcon>

                          {item.status === "draft" && (
                            <>
                              <ActionIcon
                                variant="light"
                                color="green"
                                loading={actionLoading === item.id}
                                onClick={() =>
                                  void completeReturn(item.id)
                                }
                                aria-label="Завершить возврат"
                              >
                                <IconCheck size={16} />
                              </ActionIcon>

                              <ActionIcon
                                variant="light"
                                color="red"
                                loading={actionLoading === item.id}
                                onClick={() => void deleteReturn(item.id)}
                                aria-label="Удалить возврат"
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                {filteredReturns.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center" py="lg">
                        Возвраты не найдены.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Text c="dimmed" size="sm" mt="md">
          Всего возвратов: {filteredReturns.length}
        </Text>
      </Card>

      <Modal
        opened={createOpened}
        onClose={() => setCreateOpened(false)}
        title="Создание возврата"
        size="lg"
        centered
      >
        <Stack>
          <Select
            label="Продажа"
            placeholder="Выберите завершённую продажу"
            data={saleOptions}
            value={selectedSaleId}
            onChange={handleSaleChange}
            searchable
            required
            nothingFoundMessage="Завершённые продажи не найдены"
          />

          <Select
            label="Склад возврата"
            placeholder="Выберите склад"
            data={warehouseOptions}
            value={selectedWarehouse}
            onChange={(value) => setSelectedWarehouse(value ?? "")}
            searchable
            required
          />

          {selectedSale && (
            <>
              <Title order={4}>Товары из продажи #{selectedSale.id}</Title>

              {returnLines.map((line, index) => (
                <Card key={line.sale_item} withBorder padding="sm">
                  <Stack gap="xs">
                    <Text fw={600}>{line.product_name}</Text>

                    <Text size="sm" c="dimmed">
                      Продано: {line.sold_quantity}
                    </Text>

                    <NumberInput
                      label="Количество к возврату"
                      min={0}
                      max={line.sold_quantity}
                      decimalScale={3}
                      value={line.quantity}
                      onChange={(value) =>
                        updateReturnQuantity(index, Number(value) || 0)
                      }
                    />
                  </Stack>
                </Card>
              ))}
            </>
          )}

          <Textarea
            label="Причина возврата"
            placeholder="Укажите причину возврата..."
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
          />

          <Text size="xs" c="dimmed">
            Возврат будет сохранён как черновик. Для изменения складских
            остатков его нужно будет отдельно завершить.
          </Text>

          {error && (
            <Alert color="red" title="Не удалось создать возврат">
              {error}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setCreateOpened(false)}
            >
              Отмена
            </Button>

            <Button
              loading={saving}
              onClick={() => void createReturn()}
            >
              Сохранить черновик
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={detailsOpened}
        onClose={() => setDetailsOpened(false)}
        title={`Возврат #${selectedReturn?.id ?? ""}`}
        size="lg"
        centered
      >
        {selectedReturn && (
          <Stack>
            <Group justify="space-between">
              <Text c="dimmed">Продажа</Text>
              <Text fw={600}>
                #{selectedReturn.sale_number ??
                  getRelationId(selectedReturn.sale)}
              </Text>
            </Group>

            <Group justify="space-between">
              <Text c="dimmed">Статус</Text>
              <Badge color={getStatusColor(selectedReturn.status)}>
                {getStatusLabel(selectedReturn.status)}
              </Badge>
            </Group>

            <Group justify="space-between">
              <Text c="dimmed">Дата создания</Text>
              <Text>{formatDate(selectedReturn.created_at)}</Text>
            </Group>

            <Group justify="space-between">
              <Text c="dimmed">Дата завершения</Text>
              <Text>{formatDate(selectedReturn.completed_at)}</Text>
            </Group>

            <Title order={4}>Товары</Title>

            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID товара в продаже</Table.Th>
                  <Table.Th>Количество</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {(selectedReturn.items || []).map((item) => (
                  <Table.Tr key={item.id}>
                    <Table.Td>#{getRelationId(item.sale_item)}</Table.Td>
                    <Table.Td>{item.quantity}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Text size="sm" c="dimmed">
              Причина: {selectedReturn.reason || "Не указана"}
            </Text>

            {selectedReturn.status === "draft" && (
              <Group justify="flex-end">
                <Button
                  color="red"
                  variant="light"
                  loading={actionLoading === selectedReturn.id}
                  onClick={() => void deleteReturn(selectedReturn.id)}
                >
                  Удалить черновик
                </Button>

                <Button
                  color="green"
                  loading={actionLoading === selectedReturn.id}
                  onClick={() =>
                    void completeReturn(selectedReturn.id)
                  }
                >
                  <IconCheck size={16} />
                  Завершить возврат
                </Button>
              </Group>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

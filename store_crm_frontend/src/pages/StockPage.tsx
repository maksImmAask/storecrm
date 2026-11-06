
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconBuildingWarehouse,
  IconPackages,
  IconRefresh,
  IconSearch,
  IconArrowsExchange,
} from "@tabler/icons-react";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../api/client";

interface StockItem {
  id: number;
  warehouse: number;
  warehouse_name: string;
  product: number;
  product_name: string;
  quantity: number | string;
  reserved_quantity: number | string;
  available_quantity: number | string;
  updated_at: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface StockMovement {
  id: number;
  warehouse_name: string;
  product_name: string;
  movement_type: string;
  quantity: number | string;
  quantity_before: number | string;
  quantity_after: number | string;
  comment: string;
  created_at: string;
}

interface ApiList<T> {
  results?: T[];
  data?: T[];
  items?: T[];
}

function getList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (typeof data === "object" && data !== null) {
    const object = data as ApiList<T>;

    if (Array.isArray(object.results)) return object.results;
    if (Array.isArray(object.data)) return object.data;
    if (Array.isArray(object.items)) return object.items;
  }

  return [];
}

function numberValue(value: number | string | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

function formatNumber(value: number | string): string {
  return numberValue(value).toLocaleString("ru-RU");
}

function formatDate(value: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("ru-RU");
}

function getMovementLabel(type: string): string {
  const labels: Record<string, string> = {
    receipt: "Поступление",
    sale: "Продажа",
    return: "Возврат",
    transfer_in: "Перемещение (приход)",
    transfer_out: "Перемещение (расход)",
    correction: "Корректировка",
  };

  return labels[type] ?? type;
}

function getMovementColor(type: string): string {
  const colors: Record<string, string> = {
    receipt: "green",
    sale: "red",
    return: "blue",
    transfer_in: "teal",
    transfer_out: "orange",
    correction: "gray",
  };

  return colors[type] ?? "gray";
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: string;
            message?: string;
          };
        };
      }
    ).response;

    return (
      response?.data?.detail ??
      response?.data?.message ??
      "Сервер вернул ошибку при загрузке данных."
    );
  }

  return "Не удалось подключиться к API. Проверьте работу backend.";
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: typeof IconPackages;
  color: string;
}) {
  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="sm" c="dimmed">
            {title}
          </Text>

          <Title order={2} mt="sm">
            {value}
          </Title>
        </div>

        <Icon
          size={28}
          color={`var(--mantine-color-${color}-6)`}
        />
      </Group>
    </Card>
  );
}

export default function StockPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [stockLoading, setStockLoading] = useState(true);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);

  const [stockError, setStockError] = useState("");
  const [warehousesError, setWarehousesError] = useState("");
  const [movementsError, setMovementsError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);

  const loadStock = useCallback(async () => {
    setStockLoading(true);
    setStockError("");

    try {
      const response = await api.get("/stock/");
      setStock(getList<StockItem>(response.data));
    } catch (error: unknown) {
      setStockError(getErrorMessage(error));
    } finally {
      setStockLoading(false);
    }
  }, []);

  const loadWarehouses = useCallback(async () => {
    setWarehousesLoading(true);
    setWarehousesError("");

    try {
      const response = await api.get("/warehouses/");
      setWarehouses(getList<Warehouse>(response.data));
    } catch (error: unknown) {
      setWarehousesError(getErrorMessage(error));
    } finally {
      setWarehousesLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setMovementsLoading(true);
    setMovementsError("");

    try {
      const response = await api.get("/stock-movements/");
      setMovements(getList<StockMovement>(response.data));
    } catch (error: unknown) {
      setMovementsError(getErrorMessage(error));
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  const reloadAll = useCallback(() => {
    void loadStock();
    void loadWarehouses();
    void loadMovements();
  }, [loadStock, loadWarehouses, loadMovements]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const filteredStock = useMemo(() => {
    const query = search.trim().toLowerCase();

    return stock.filter((item) => {
      const matchesSearch =
        !query ||
        item.product_name.toLowerCase().includes(query) ||
        item.warehouse_name.toLowerCase().includes(query) ||
        String(item.product).includes(query) ||
        String(item.id).includes(query);

      const matchesWarehouse =
        !selectedWarehouse ||
        String(item.warehouse) === selectedWarehouse;

      return matchesSearch && matchesWarehouse;
    });
  }, [stock, search, selectedWarehouse]);

  const totalQuantity = filteredStock.reduce(
    (sum, item) => sum + numberValue(item.quantity),
    0
  );

  const totalReserved = filteredStock.reduce(
    (sum, item) => sum + numberValue(item.reserved_quantity),
    0
  );

  const totalAvailable = filteredStock.reduce(
    (sum, item) => sum + numberValue(item.available_quantity),
    0
  );

  const warehouseOptions = warehouses.map((warehouse) => ({
    value: String(warehouse.id),
    label: warehouse.name,
  }));

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Складские остатки</Title>

          <Text c="dimmed" size="sm" mt={4}>
            Остатки, резервы и история движения товаров
          </Text>
        </div>

        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={reloadAll}
          loading={stockLoading || warehousesLoading || movementsLoading}
        >
          Обновить
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <StatCard
          title="Всего единиц"
          value={formatNumber(totalQuantity)}
          icon={IconPackages}
          color="blue"
        />

        <StatCard
          title="Зарезервировано"
          value={formatNumber(totalReserved)}
          icon={IconBuildingWarehouse}
          color="orange"
        />

        <StatCard
          title="Доступно"
          value={formatNumber(totalAvailable)}
          icon={IconArrowsExchange}
          color="green"
        />
      </SimpleGrid>

      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Текущие остатки</Title>

          <Badge variant="light">
            {filteredStock.length} записей
          </Badge>
        </Group>

        <Group mb="md" align="flex-end">
          <TextInput
            style={{ flex: 1 }}
            placeholder="Поиск по товару или складу"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(event) => setSearch(event.currentTarget.value)}
          />

          <Select
            style={{ flex: 1 }}
            clearable
            searchable
            placeholder="Все склады"
            data={warehouseOptions}
            value={selectedWarehouse}
onChange={(value) => setSelectedWarehouse(value ?? "")}            disabled={warehousesLoading}
          />
        </Group>

        {warehousesError && (
          <Alert color="red" mb="md">
            Не удалось загрузить список складов: {warehousesError}
          </Alert>
        )}

        {stockError && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={18} />}
            title="Не удалось загрузить остатки"
            mb="md"
          >
            {stockError}
          </Alert>
        )}

        {stockLoading ? (
          <Group justify="center" py="xl">
            <Loader />
            <Text c="dimmed">Загружаем остатки...</Text>
          </Group>
        ) : (
          <ScrollArea>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              miw={850}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Товар</Table.Th>
                  <Table.Th>Склад</Table.Th>
                  <Table.Th>Количество</Table.Th>
                  <Table.Th>Резерв</Table.Th>
                  <Table.Th>Доступно</Table.Th>
                  <Table.Th>Обновлено</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredStock.map((item) => {
                  const available = numberValue(item.available_quantity);

                  return (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.id}</Table.Td>
                      <Table.Td>{item.product_name}</Table.Td>
                      <Table.Td>{item.warehouse_name}</Table.Td>
                      <Table.Td>{formatNumber(item.quantity)}</Table.Td>
                      <Table.Td>{formatNumber(item.reserved_quantity)}</Table.Td>

                      <Table.Td>
                        <Badge color={available > 0 ? "green" : "red"}>
                          {formatNumber(available)}
                        </Badge>
                      </Table.Td>

                      <Table.Td>{formatDate(item.updated_at)}</Table.Td>
                    </Table.Tr>
                  );
                })}

                {filteredStock.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center" py="xl">
                        Остатков не найдено.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>

      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>История движений</Title>

          <Badge variant="light">
            {movements.length} записей
          </Badge>
        </Group>

        {movementsError && (
          <Alert
            color="red"
            icon={<IconAlertTriangle size={18} />}
            title="Не удалось загрузить историю"
            mb="md"
          >
            {movementsError}
          </Alert>
        )}

        {movementsLoading ? (
          <Group justify="center" py="lg">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              Загружаем движения...
            </Text>
          </Group>
        ) : (
          <ScrollArea>
            <Table
              striped
              highlightOnHover
              withTableBorder
              miw={950}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Товар</Table.Th>
                  <Table.Th>Склад</Table.Th>
                  <Table.Th>Тип движения</Table.Th>
                  <Table.Th>Количество</Table.Th>
                  <Table.Th>До</Table.Th>
                  <Table.Th>После</Table.Th>
                  <Table.Th>Дата</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {movements.slice(0, 50).map((movement) => (
                  <Table.Tr key={movement.id}>
                    <Table.Td>{movement.id}</Table.Td>
                    <Table.Td>{movement.product_name}</Table.Td>
                    <Table.Td>{movement.warehouse_name}</Table.Td>

                    <Table.Td>
                      <Badge color={getMovementColor(movement.movement_type)}>
                        {getMovementLabel(movement.movement_type)}
                      </Badge>
                    </Table.Td>

                    <Table.Td>{formatNumber(movement.quantity)}</Table.Td>
                    <Table.Td>{formatNumber(movement.quantity_before)}</Table.Td>
                    <Table.Td>{formatNumber(movement.quantity_after)}</Table.Td>
                    <Table.Td>{formatDate(movement.created_at)}</Table.Td>
                  </Table.Tr>
                ))}

                {movements.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text c="dimmed" ta="center" py="lg">
                        История движений пока пуста.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}
      </Card>
    </Stack>
  );
}


import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
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

type ApiRecord = Record<string, unknown>;

interface StockItem {
  id?: number | string;
  product?: unknown;
  warehouse?: unknown;
  quantity?: number | string;
  reserved_quantity?: number | string;
  reserved?: number | string;
  available_quantity?: number | string;
  [key: string]: unknown;
}

function getList(data: unknown): ApiRecord[] {
  let result: unknown = data;

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    const object = data as ApiRecord;

    if (Array.isArray(object.results)) {
      result = object.results;
    } else if (Array.isArray(object.data)) {
      result = object.data;
    } else if (Array.isArray(object.items)) {
      result = object.items;
    }
  }

  if (!Array.isArray(result)) {
    return [];
  }

  return result.filter(
    (item): item is ApiRecord =>
      typeof item === "object" && item !== null,
  );
}

function readValue(
  object: ApiRecord,
  keys: string[],
): unknown {
  for (const key of keys) {
    let value: unknown = object;

    for (const part of key.split(".")) {
      if (
        value === null ||
        typeof value !== "object" ||
        !(part in value)
      ) {
        value = undefined;
        break;
      }

      value = (value as ApiRecord)[part];
    }

    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "object") {
    const object = value as ApiRecord;

    return String(
      object.name ??
      object.title ??
      object.full_name ??
      object.sku ??
      object.id ??
      "—",
    );
  }

  if (typeof value === "boolean") {
    return value ? "Да" : "Нет";
  }

  return String(value);
}

function numericValue(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
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
      "Сервер вернул ошибку при загрузке складских данных."
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
  const [movements, setMovements] = useState<ApiRecord[]>([]);

  const [stockLoading, setStockLoading] = useState(true);
  const [movementsLoading, setMovementsLoading] = useState(true);

  const [stockError, setStockError] = useState("");
  const [movementsError, setMovementsError] = useState("");
  const [search, setSearch] = useState("");

  const loadStock = useCallback(async () => {
    setStockLoading(true);
    setStockError("");

    try {
      const response = await api.get("/stock/");
      setStock(getList(response.data) as StockItem[]);
    } catch (error: unknown) {
      setStockError(getErrorMessage(error));
    } finally {
      setStockLoading(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    setMovementsLoading(true);
    setMovementsError("");

    try {
      const response = await api.get("/stock-movements/");
      setMovements(getList(response.data));
    } catch (error: unknown) {
      setMovementsError(getErrorMessage(error));
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  const reloadAll = useCallback(() => {
    void loadStock();
    void loadMovements();
  }, [loadStock, loadMovements]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const filteredStock = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return stock;
    }

    return stock.filter((item) => {
      const values = [
        readValue(item, ["product.name", "product_name", "product"]),
        readValue(item, ["product.sku", "sku"]),
        readValue(item, ["warehouse.name", "warehouse_name", "warehouse"]),
      ];

      return values.some((value) =>
        displayValue(value).toLowerCase().includes(query),
      );
    });
  }, [stock, search]);

  const totalQuantity = stock.reduce(
    (sum, item) =>
      sum + numericValue(readValue(item, ["quantity", "stock_quantity"])),
    0,
  );

  const totalReserved = stock.reduce(
    (sum, item) =>
      sum +
      numericValue(
        readValue(item, ["reserved_quantity", "reserved", "reserved_stock"]),
      ),
    0,
  );

  const totalAvailable = stock.reduce((sum, item) => {
    const available = readValue(item, [
      "available_quantity",
      "available",
    ]);

    if (available !== undefined) {
      return sum + numericValue(available);
    }

    return (
      sum +
      numericValue(readValue(item, ["quantity", "stock_quantity"])) -
      numericValue(
        readValue(item, ["reserved_quantity", "reserved", "reserved_stock"]),
      )
    );
  }, 0);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Складские остатки</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Остатки, резервы и история движений товаров
          </Text>
        </div>

        <Button
          leftSection={<IconRefresh size={16} />}
          variant="light"
          onClick={reloadAll}
          loading={stockLoading || movementsLoading}
        >
          Обновить
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <StatCard
          title="Всего единиц"
          value={totalQuantity.toLocaleString("ru-RU")}
          icon={IconPackages}
          color="blue"
        />

        <StatCard
          title="Зарезервировано"
          value={totalReserved.toLocaleString("ru-RU")}
          icon={IconBuildingWarehouse}
          color="orange"
        />

        <StatCard
          title="Доступно"
          value={totalAvailable.toLocaleString("ru-RU")}
          icon={IconArrowsExchange}
          color="green"
        />
      </SimpleGrid>

      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Текущие остатки</Title>
          <Badge variant="light">{filteredStock.length} записей</Badge>
        </Group>

        <TextInput
          placeholder="Поиск по товару, артикулу или складу"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          mb="md"
        />

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
            <Text c="dimmed">Загружаем складские остатки...</Text>
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
                  <Table.Th>Артикул</Table.Th>
                  <Table.Th>Склад</Table.Th>
                  <Table.Th>Количество</Table.Th>
                  <Table.Th>Резерв</Table.Th>
                  <Table.Th>Доступно</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredStock.map((item, index) => {
                  const quantity = numericValue(
                    readValue(item, ["quantity", "stock_quantity"]),
                  );

                  const reserved = numericValue(
                    readValue(item, [
                      "reserved_quantity",
                      "reserved",
                      "reserved_stock",
                    ]),
                  );

                  const availableValue = readValue(item, [
                    "available_quantity",
                    "available",
                  ]);

                  const available =
                    availableValue === undefined
                      ? quantity - reserved
                      : numericValue(availableValue);

                  return (
                    <Table.Tr key={String(item.id ?? index)}>
                      <Table.Td>{displayValue(item.id)}</Table.Td>

                      <Table.Td>
                        {displayValue(
                          readValue(item, [
                            "product.name",
                            "product_name",
                            "product",
                          ]),
                        )}
                      </Table.Td>

                      <Table.Td>
                        {displayValue(
                          readValue(item, ["product.sku", "sku"]),
                        )}
                      </Table.Td>

                      <Table.Td>
                        {displayValue(
                          readValue(item, [
                            "warehouse.name",
                            "warehouse_name",
                            "warehouse",
                          ]),
                        )}
                      </Table.Td>

                      <Table.Td>{quantity}</Table.Td>
                      <Table.Td>{reserved}</Table.Td>

                      <Table.Td>
                        <Badge color={available > 0 ? "green" : "red"}>
                          {available}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}

                {filteredStock.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text c="dimmed" ta="center" py="xl">
                        {search
                          ? "Ничего не найдено."
                          : "Складских остатков пока нет."}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Text c="dimmed" size="xs" mt="md">
          Показаны данные, полученные от backend.
        </Text>
      </Card>

      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>История движений</Title>
          <Badge variant="light">{movements.length} записей</Badge>
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
              miw={750}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Товар</Table.Th>
                  <Table.Th>Тип</Table.Th>
                  <Table.Th>Количество</Table.Th>
                  <Table.Th>Дата</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {movements.slice(0, 50).map((movement, index) => (
                  <Table.Tr key={String(movement.id ?? index)}>
                    <Table.Td>{displayValue(movement.id)}</Table.Td>

                    <Table.Td>
                      {displayValue(
                        readValue(movement, [
                          "product.name",
                          "product_name",
                          "product",
                        ]),
                      )}
                    </Table.Td>

                    <Table.Td>
                      {displayValue(
                        readValue(movement, [
                          "movement_type",
                          "type",
                          "reason",
                        ]),
                      )}
                    </Table.Td>

                    <Table.Td>
                      {displayValue(
                        readValue(movement, [
                          "quantity",
                          "amount",
                          "quantity_change",
                        ]),
                      )}
                    </Table.Td>

                    <Table.Td>
                      {displayValue(
                        readValue(movement, [
                          "created_at",
                          "timestamp",
                          "date",
                        ]),
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}

                {movements.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" ta="center" py="lg">
                        История движений пуста.
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

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconChartBar,
  IconRefresh,
  IconPackage,
} from "@tabler/icons-react";

import api from "../api/client";

interface Branch {
  id: number;
  name: string;
}

interface Warehouse {
  id: number;
  name: string;
}

interface SalesReportRow {
  branch_id: number;
  branch__name: string;
  checks: number;
  revenue: number | string;
}

interface StockReportRow {
  warehouse: string;
  product_id: number;
  product: string;
  quantity: number | string;
  reserved_quantity: number | string;
  available_quantity: number | string;
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

function money(value: number | string): string {
  return (
    new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 0,
    }).format(Number(value) || 0) + " сум"
  );
}

function number(value: number | string): number {
  return Number(value) || 0;
}

function localDate(daysAgo = 0): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<string | null>("sales");

  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const [salesRows, setSalesRows] = useState<SalesReportRow[]>([]);
  const [stockRows, setStockRows] = useState<StockReportRow[]>([]);

  const [dateFrom, setDateFrom] = useState(localDate(30));
  const [dateTo, setDateTo] = useState(localDate());
  const [branchId, setBranchId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string | null>(null);

  const [salesLoading, setSalesLoading] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [error, setError] = useState("");

  const loadReferences = useCallback(async () => {
    const [branchesResponse, warehousesResponse] = await Promise.all([
      api.get("/branches/"),
      api.get("/warehouses/"),
    ]);

    setBranches(getList<Branch>(branchesResponse.data));
    setWarehouses(getList<Warehouse>(warehousesResponse.data));
  }, []);

  const loadSalesReport = useCallback(async () => {
    try {
      setSalesLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (branchId) params.branch = branchId;

      const response = await api.get("/reports/sales/", { params });

      setSalesRows(getList<SalesReportRow>(response.data));
    } catch (err) {
      console.error("Sales report error:", err);
      setError("Не удалось загрузить отчёт по продажам.");
    } finally {
      setSalesLoading(false);
    }
  }, [dateFrom, dateTo, branchId]);

  const loadStockReport = useCallback(async () => {
    try {
      setStockLoading(true);
      setError("");

      const params: Record<string, string> = {};

      if (warehouseId) params.warehouse = warehouseId;

      const response = await api.get("/reports/stock/", { params });

      setStockRows(getList<StockReportRow>(response.data));
    } catch (err) {
      console.error("Stock report error:", err);
      setError("Не удалось загрузить отчёт по складу.");
    } finally {
      setStockLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    const init = async () => {
      try {
        setInitialLoading(true);
        await loadReferences();
      } catch (err) {
        console.error("Reports initialization error:", err);
        setError("Не удалось загрузить филиалы и склады.");
      } finally {
        setInitialLoading(false);
      }
    };

    void init();
  }, [loadReferences]);

  useEffect(() => {
    if (!initialLoading) {
      void loadSalesReport();
    }
  }, [initialLoading, loadSalesReport]);

  useEffect(() => {
    if (!initialLoading) {
      void loadStockReport();
    }
  }, [initialLoading, loadStockReport]);

  const totalRevenue = salesRows.reduce(
    (sum, row) => sum + number(row.revenue),
    0,
  );

  const totalChecks = salesRows.reduce(
    (sum, row) => sum + number(row.checks),
    0,
  );

  const totalQuantity = stockRows.reduce(
    (sum, row) => sum + number(row.quantity),
    0,
  );

  const totalReserved = stockRows.reduce(
    (sum, row) => sum + number(row.reserved_quantity),
    0,
  );

  const totalAvailable = stockRows.reduce(
    (sum, row) => sum + number(row.available_quantity),
    0,
  );

  if (initialLoading) {
    return (
      <Stack align="center" justify="center" py={100}>
        <Loader size="lg" />
        <Text c="dimmed">Загрузка отчётов...</Text>
      </Stack>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Отчёты</Title>
          <Text c="dimmed" size="sm">
            Аналитика продаж и складских остатков
          </Text>
        </div>

        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={() => {
            if (activeTab === "sales") {
              void loadSalesReport();
            } else {
              void loadStockReport();
            }
          }}
          loading={salesLoading || stockLoading}
        >
          Обновить
        </Button>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      )}

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab
            value="sales"
            leftSection={<IconChartBar size={16} />}
          >
            Продажи
          </Tabs.Tab>

          <Tabs.Tab
            value="stock"
            leftSection={<IconPackage size={16} />}
          >
            Склад
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="sales" pt="lg">
          <Stack gap="lg">
            <Paper withBorder radius="md" p="md">
              <Title order={5} mb="md">
                Фильтры продаж
              </Title>

              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                <TextInput
                  label="Дата с"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.currentTarget.value)}
                />

                <TextInput
                  label="Дата по"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.currentTarget.value)}
                />

                <Select
                  label="Филиал"
                  placeholder="Все филиалы"
                  clearable
                  data={branches.map((branch) => ({
                    value: String(branch.id),
                    label: branch.name,
                  }))}
                  value={branchId}
                  onChange={(value) => setBranchId(value)}
                />

                <Group align="flex-end">
                  <Button
                    fullWidth
                    onClick={() => void loadSalesReport()}
                    loading={salesLoading}
                  >
                    Применить
                  </Button>
                </Group>
              </SimpleGrid>

              {dateFrom && dateTo && dateFrom > dateTo && (
                <Text c="red" size="sm" mt="sm">
                  Начальная дата не может быть позже конечной.
                </Text>
              )}
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Paper withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Общая выручка
                </Text>
                <Title order={2} c="green" mt={5}>
                  {money(totalRevenue)}
                </Title>
              </Paper>

              <Paper withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Всего чеков
                </Text>
                <Title order={2} mt={5}>
                  {totalChecks}
                </Title>
              </Paper>
            </SimpleGrid>

            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb="md">
                <Title order={4}>Продажи по филиалам</Title>
                <Text size="sm" c="dimmed">
                  {salesRows.length} филиалов
                </Text>
              </Group>

              {salesLoading ? (
                <Group justify="center" py="xl">
                  <Loader />
                </Group>
              ) : salesRows.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  За выбранный период продаж нет.
                </Text>
              ) : (
                <Table.ScrollContainer minWidth={550}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Филиал</Table.Th>
                        <Table.Th>Количество чеков</Table.Th>
                        <Table.Th>Выручка</Table.Th>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {salesRows.map((row) => (
                        <Table.Tr key={row.branch_id}>
                          <Table.Td fw={500}>{row.branch__name}</Table.Td>
                          <Table.Td>{row.checks}</Table.Td>
                          <Table.Td fw={600}>
                            {money(row.revenue)}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>

                    <Table.Tfoot>
                      <Table.Tr>
                        <Table.Th>Итого</Table.Th>
                        <Table.Th>{totalChecks}</Table.Th>
                        <Table.Th>{money(totalRevenue)}</Table.Th>
                      </Table.Tr>
                    </Table.Tfoot>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="stock" pt="lg">
          <Stack gap="lg">
            <Paper withBorder radius="md" p="md">
              <Title order={5} mb="md">
                Фильтры склада
              </Title>

              <Group align="flex-end">
                <Select
                  label="Склад"
                  placeholder="Все склады"
                  clearable
                  searchable
                  style={{ flex: 1 }}
                  data={warehouses.map((warehouse) => ({
                    value: String(warehouse.id),
                    label: warehouse.name,
                  }))}
                  value={warehouseId}
                  onChange={(value) => setWarehouseId(value)}
                />

                <Button
                  onClick={() => void loadStockReport()}
                  loading={stockLoading}
                >
                  Применить
                </Button>
              </Group>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
              <Paper withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Всего товара
                </Text>
                <Title order={2} mt={5}>
                  {totalQuantity}
                </Title>
              </Paper>

              <Paper withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Зарезервировано
                </Text>
                <Title order={2} c="orange" mt={5}>
                  {totalReserved}
                </Title>
              </Paper>

              <Paper withBorder radius="md" p="lg">
                <Text size="sm" c="dimmed">
                  Доступно
                </Text>
                <Title order={2} c="green" mt={5}>
                  {totalAvailable}
                </Title>
              </Paper>
            </SimpleGrid>

            <Paper withBorder radius="md" p="md">
              <Group justify="space-between" mb="md">
                <Title order={4}>Остатки товаров</Title>
                <Text size="sm" c="dimmed">
                  {stockRows.length} позиций
                </Text>
              </Group>

              {stockLoading ? (
                <Group justify="center" py="xl">
                  <Loader />
                </Group>
              ) : stockRows.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">
                  Складские остатки не найдены.
                </Text>
              ) : (
                <Table.ScrollContainer minWidth={750}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Товар</Table.Th>
                        <Table.Th>Склад</Table.Th>
                        <Table.Th>Всего</Table.Th>
                        <Table.Th>Резерв</Table.Th>
                        <Table.Th>Доступно</Table.Th>
                      </Table.Tr>
                    </Table.Thead>

                    <Table.Tbody>
                      {stockRows.map((row, index) => (
                        <Table.Tr key={`${row.product_id}-${row.warehouse}-${index}`}>
                          <Table.Td fw={500}>{row.product}</Table.Td>
                          <Table.Td>{row.warehouse}</Table.Td>
                          <Table.Td>{row.quantity}</Table.Td>
                          <Table.Td>{row.reserved_quantity}</Table.Td>
                          <Table.Td>
                            <Text
                              fw={600}
                              c={number(row.available_quantity) > 0 ? "green" : "red"}
                            >
                              {row.available_quantity}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

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
  IconEye,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconCheck
} from "@tabler/icons-react";
import api from "../api/client";

type ApiObject = Record<string, unknown> & {
  id: number | string;
};

interface ProductOption {
  value: string;
  label: string;
  price: number;
}

interface SaleLine {
  product: string;
  quantity: number;
}

interface Sale {
  id: number;
  branch: number | string;
  warehouse: number | string;
  customer: number | string | null;
  status: string;
  payment_type: string;
  subtotal: string;
  discount_amount: string;
  total_amount: string;
  paid_amount: string;
  comment: string;
  created_at: string;
  completed_at: string | null;
  cashier_name?: string;
  items: Array<{
    id: number;
    product: number;
    product_name: string;
    quantity: string;
    unit_price: string;
    discount_amount: string;
    line_total: string;
  }>;
}

function getArray(data: unknown): ApiObject[] {
  if (Array.isArray(data)) return data as ApiObject[];

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

function getLabel(item: ApiObject): string {
  const name =
    item.name ??
    item.title ??
    item.full_name ??
    item.company_name ??
    item.email ??
    `Запись #${item.id}`;

  return String(name);
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

function money(value: number | string): string {
  return `${Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusColor(status: string): string {
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "yellow";
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [branches, setBranches] = useState<ApiObject[]>([]);
  const [warehouses, setWarehouses] = useState<ApiObject[]>([]);
  const [customers, setCustomers] = useState<ApiObject[]>([]);
  const [products, setProducts] = useState<ApiObject[]>([]);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [returnOpened, setReturnOpened] = useState(false);
const [returnWarehouse, setReturnWarehouse] = useState<string | null>(null);
const [returnReason, setReturnReason] = useState("");

const [returnLines, setReturnLines] = useState<
Array<{
    sale_item: number;
    product_name: string;
    sold_quantity: number;
    quantity: number;
}>
>([]);

  const [opened, setOpened] = useState(false);
  const [detailsOpened, setDetailsOpened] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const [branch, setBranch] = useState<string | null>(null);
  const [warehouse, setWarehouse] = useState<string | null>(null);
  const [customer, setCustomer] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string | null>("cash");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState<SaleLine[]>([
    { product: "", quantity: 1},
  ]);

  const loadSales = useCallback(async () => {
    const response = await api.get("/sales/");
    setSales(getArray(response.data) as unknown as Sale[]);
  }, []);

  const loadReferences = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get("/branches/"),
      api.get("/warehouses/"),
      api.get("/customers/"),
      api.get("/products/"),
    ]);

    if (results[0].status === "fulfilled") {
      setBranches(getArray(results[0].value.data));
    }

    if (results[1].status === "fulfilled") {
      setWarehouses(getArray(results[1].value.data));
    }

    if (results[2].status === "fulfilled") {
      setCustomers(getArray(results[2].value.data));
    }

    if (results[3].status === "fulfilled") {
      setProducts(getArray(results[3].value.data));
    }

    const failed = results.find((result) => result.status === "rejected");

    if (failed?.status === "rejected") {
      console.warn("Не все справочники удалось загрузить:", failed.reason);
    }
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([loadSales(), loadReferences()]);
    } catch (e) {
      setError(getError(e));
    } finally {
      setLoading(false);
    }
  }, [loadSales, loadReferences]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const branchOptions = useMemo(
    () =>
      branches.map((item) => ({
        value: String(item.id),
        label: getLabel(item),
      })),
    [branches],
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses
        .filter((item) => {
          if (!branch) return true;

          const branchValue = item.branch;
          const branchId =
            branchValue && typeof branchValue === "object"
              ? (branchValue as Record<string, unknown>).id
              : branchValue;

          return branchId === undefined || String(branchId) === branch;
        })
        .map((item) => ({
          value: String(item.id),
          label: getLabel(item),
        })),
    [warehouses, branch],
  );

  const customerOptions = useMemo(
    () => [
      { value: "", label: "Без клиента" },
      ...customers.map((item) => ({
        value: String(item.id),
        label: getLabel(item),
      })),
    ],
    [customers],
  );

  const productOptions: ProductOption[] = useMemo(
    () =>
      products.map((item) => ({
        value: String(item.id),
        label: `${getLabel(item)} (#${item.id})`,
        price: Number(item.sale_price ?? item.price ?? 0),
      })),
    [products],
  );

    const getProductPrice = (productId: string) =>
  productOptions.find((item) => item.value === productId)?.price ?? 0;

const subtotal = lines.reduce((sum, line) => {
  return sum + getProductPrice(line.product) * line.quantity;
}, 0);

const total = Math.max(0, subtotal - saleDiscount);


  const filteredSales = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return sales;

    return sales.filter((sale) =>
      [
        sale.id,
        sale.status,
        sale.payment_type,
        sale.cashier_name,
        sale.customer,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [sales, search]);

  function resetForm() {
    setBranch(null);
    setWarehouse(null);
    setCustomer(null);
    setPaymentType("cash");
    setPaidAmount(0);
    setSaleDiscount(0);
    setComment("");
    setLines([{ product: "", quantity: 1}]);
    setError("");
  }

  function updateLine(index: number, changes: Partial<SaleLine>) {
    setLines((previous) =>
      previous.map((line, i) =>
        i === index ? { ...line, ...changes } : line,
      ),
    );
  }

  function addLine() {
    setLines((previous) => [
      ...previous,
      { product: "", quantity: 1, discount_amount: 0 },
    ]);
  }

  function removeLine(index: number) {
    setLines((previous) => previous.filter((_, i) => i !== index));
  }

  async function createSale() {
    setError("");

    if (!branch || !warehouse) {
      setError("Выбери филиал и склад.");
      return;
    }

    if (lines.length === 0 || lines.some((line) => !line.product)) {
      setError("Добавь хотя бы один товар и выбери его.");
      return;
    }

    if (new Set(lines.map((line) => line.product)).size !== lines.length) {
      setError("Один товар нельзя добавлять в чек несколько раз.");
      return;
    }

    if (lines.some((line) => line.quantity <= 0)) {
      setError("Количество товара должно быть больше нуля.");
      return;
    }

    if (saleDiscount > subtotal) {
      setError("Общая скидка не может превышать сумму товаров.");
      return;
    }

    if (paymentType === "debt" && !customer) {
      setError("Для продажи в долг необходимо выбрать клиента.");
      return;
    }

    if (paidAmount > total) {
      setError("Оплаченная сумма не может превышать итоговую сумму.");
      return;
    }

    if (paymentType !== "debt" && paidAmount !== total) {
      setError("Для этого способа оплаты нужно указать полную оплату.");
      return;
    }

    if (paymentType === "debt" && paidAmount === total) {
      setError("Для продажи в долг укажи сумму меньше полной стоимости.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/sales/", {
        branch: Number(branch),
        warehouse: Number(warehouse),
        customer: customer ? Number(customer) : null,
        payment_type: paymentType,
        paid_amount: paidAmount,
        discount_amount: saleDiscount,
        comment,
        items: lines.map((line) => ({
  product: Number(line.product),
  quantity: line.quantity,
})),
      });

      setOpened(false);
      resetForm();
      await loadSales();
    } catch (e) {
      setError(getError(e));
    } finally {
      setSaving(false);
    }
  }
  function openReturn(sale: Sale) {
  if (sale.status !== "completed") {
    setError("Возвращать можно только товары из завершённой продажи.");
    return;
  }

  setSelectedSale(sale);
  setReturnWarehouse(null);
  setReturnReason("");

  setReturnLines(
    sale.items.map((item) => ({
      sale_item: item.id,
      product_name: item.product_name,
      sold_quantity: Number(item.quantity),
      quantity: 0,
    })),
  );

  setError("");
  setReturnOpened(true);
}

async function createReturn() {
  if (!selectedSale) return;

  if (!returnWarehouse) {
    setError("Выбери склад для возврата.");
    return;
  }

  const items = returnLines
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      sale_item: item.sale_item,
      quantity: item.quantity,
    }));

  if (items.length === 0) {
    setError("Укажи количество хотя бы одного возвращаемого товара.");
    return;
  }

  if (
    returnLines.some(
      (item) =>
        item.quantity < 0 ||
        item.quantity > item.sold_quantity,
    )
  ) {
    setError("Количество возврата не может превышать проданное количество.");
    return;
  }

  setSaving(true);
  setError("");

  try {
    const response = await api.post("/sale-returns/", {
      sale: selectedSale.id,
      warehouse: Number(returnWarehouse),
      reason: returnReason,
      items,
    });

    const returnId = response.data.id;

    await api.post(`/sale-returns/${returnId}/complete/`);

    setReturnOpened(false);
    setDetailsOpened(false);
    setSelectedSale(null);

    await loadSales();
  } catch (e) {
    setError(getError(e));
  } finally {
    setSaving(false);
  }
}
  async function completeSale(saleId: number) {
  const confirmed = window.confirm(
    `Завершить продажу #${saleId}? Остатки товаров будут обновлены.`,
  );

  if (!confirmed) return;

  setActionLoading(saleId);
  setError("");

  try {
    await api.post(`/sales/${saleId}/complete/`);

    await loadSales();

    setDetailsOpened(false);
    setSelectedSale(null);
  } catch (e) {
    setError(getError(e));
  } finally {
    setActionLoading(null);
  }
}

  function openDetails(sale: Sale) {
    setSelectedSale(sale);
    setDetailsOpened(true);
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={2}>Продажи</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Управление чеками и создание новых продаж.
          </Text>
        </div>

        <Group>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void loadPage()}
          >
            Обновить
          </Button>

          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => {
              resetForm();
              setOpened(true);
            }}
          >
            Новая продажа
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      )}

      <Card withBorder radius="md" padding="md">
        <TextInput
          mb="md"
          placeholder="Поиск по номеру, статусу, оплате..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
          </Group>
        ) : (
          <ScrollArea>
            <Table striped highlightOnHover miw={850}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>№</Table.Th>
                  <Table.Th>Дата</Table.Th>
                  <Table.Th>Статус</Table.Th>
                  <Table.Th>Оплата</Table.Th>
                  <Table.Th>Сумма</Table.Th>
                  <Table.Th>Оплачено</Table.Th>
                  <Table.Th>Кассир</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredSales.map((sale) => (
                  <Table.Tr key={sale.id}>
                    <Table.Td>#{sale.id}</Table.Td>
                    <Table.Td>
                      {sale.created_at
                        ? new Date(sale.created_at).toLocaleString("ru-RU")
                        : "—"}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={statusColor(sale.status)}>
                        {sale.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{sale.payment_type}</Table.Td>
                    <Table.Td>{money(sale.total_amount)}</Table.Td>
                    <Table.Td>{money(sale.paid_amount)}</Table.Td>
                    <Table.Td>{sale.cashier_name || "—"}</Table.Td>
                    <Table.Td><Group gap={6} wrap="nowrap">
  <ActionIcon
    variant="light"
    color="blue"
    onClick={() => openDetails(sale)}
  >
    <IconEye size={16} />
  </ActionIcon>

  {sale.status === "draft" && (
    <Button
      size="xs"
      color="green"
      variant="light"
      loading={actionLoading === sale.id}
      disabled={actionLoading !== null}
      onClick={() => void completeSale(sale.id)}
    >
      <IconCheck size={16} />
      Завершить
    </Button>
  )}

  {sale.status === "completed" && (
    <Button
      size="xs"
      color="orange"
      variant="light"
      onClick={() => openReturn(sale)}
    >
      Возврат
    </Button>
  )}
</Group>
                    </Table.Td>
                  </Table.Tr>
                ))}

                {filteredSales.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={8}>
                      <Text c="dimmed" ta="center" py="lg">
                        Продажи не найдены.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Text c="dimmed" size="sm" mt="md">
          Всего продаж: {filteredSales.length}
        </Text>
      </Card>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Создание продажи"
        size="xl"
        centered
      >
        <Stack>
          <Select
            label="Филиал"
            placeholder="Выбери филиал"
            data={branchOptions}
            value={branch}
            onChange={(value) => {
              setBranch(value);
              setWarehouse(null);
            }}
            searchable
            required
          />

          <Select
            label="Склад"
            placeholder="Выбери склад"
            data={warehouseOptions}
            value={warehouse}
            onChange={(value) => setWarehouse(value ?? "")}
            searchable
            required
          />

          <Select
            label="Клиент"
            placeholder="Без клиента"
            data={customerOptions}
            value={customer ?? ""}
            onChange={(value) => setCustomer(value || null)}
            searchable
            clearable
          />

          <Title order={4}>Товары в чеке</Title>

          {lines.map((line, index) => (
            <Card key={index} withBorder padding="sm">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={600}>Товар #{index + 1}</Text>

                  <Button
                    size="xs"
                    color="red"
                    variant="subtle"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                  >
                    <IconTrash size={16} />
                  </Button>
                </Group>

                <Select
                  label="Товар"
                  placeholder="Выбери товар"
                  data={productOptions.map((product) => ({
                    value: product.value,
                    label: product.label,
                  }))}
                  value={line.product || null}
                  onChange={(value) =>
                    updateLine(index, { product: value || "" })
                  }
                  searchable
                />

                <Group grow>
                  <NumberInput
                    label="Количество"
                    min={0.001}
                    decimalScale={3}
                    value={line.quantity}
                    onChange={(value) =>
                      updateLine(index, {
                        quantity: Number(value) || 0,
                      })
                    }
                  />

                  
                </Group>

                <Text size="sm" c="dimmed">
  Цена: {money(getProductPrice(line.product))} · Сумма:{" "}
  {money(getProductPrice(line.product) * line.quantity)}
</Text>
              </Stack>
            </Card>
          ))}

          <Button variant="light" onClick={addLine}>
            <IconPlus size={16} /> Добавить товар
          </Button>

          <NumberInput
            label="Общая скидка на чек"
            min={0}
            decimalScale={2}
            value={saleDiscount}
            onChange={(value) => setSaleDiscount(Number(value) || 0)}
          />

          <Card withBorder>
            <Group justify="space-between">
              <Text c="dimmed">Сумма товаров</Text>
              <Text>{money(subtotal)}</Text>
            </Group>

            <Group justify="space-between" mt="xs">
              <Text fw={700}>Итого к оплате</Text>
              <Title order={3}>{money(total)}</Title>
            </Group>
          </Card>

          <Select
            label="Способ оплаты"
            data={[
              { value: "cash", label: "Наличные" },
              { value: "card", label: "Карта" },
              { value: "mixed", label: "Смешанная оплата" },
              { value: "debt", label: "В долг" },
            ]}
            value={paymentType}
            onChange={(value) => setPaymentType(value ?? "")}
            required
          />

          <NumberInput
            label="Оплаченная сумма"
            min={0}
            decimalScale={2}
            value={paidAmount}
            onChange={(value) => setPaidAmount(Number(value) || 0)}
          />

          {paymentType === "debt" && (
            <Text size="sm" c="orange">
              Остаток долга: {money(Math.max(0, total - paidAmount))}
            </Text>
          )}

          <Textarea
            label="Комментарий"
            placeholder="Дополнительная информация..."
            value={comment}
            onChange={(event) => setComment(event.currentTarget.value)}
          />

          {error && (
            <Alert color="red" title="Не удалось создать продажу">
              {error}
            </Alert>
          )}

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              Отмена
            </Button>

            <Button loading={saving} onClick={() => void createSale()}>
              Создать черновик
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={detailsOpened}
        onClose={() => setDetailsOpened(false)}
        title={`Продажа #${selectedSale?.id ?? ""}`}
        size="lg"
        centered
      >
        {selectedSale && (
          <Stack>
            <Group justify="space-between">
              <Text>Статус</Text>
              <Badge color={statusColor(selectedSale.status)}>
                {selectedSale.status}
              </Badge>
            </Group>

            <Group justify="space-between">
              <Text>Способ оплаты</Text>
              <Text fw={500}>{selectedSale.payment_type}</Text>
            </Group>

            <Group justify="space-between">
              <Text>Общая сумма</Text>
              <Text fw={700}>{money(selectedSale.total_amount)}</Text>
            </Group>

            <Group justify="space-between">
              <Text>Оплачено</Text>
              <Text>{money(selectedSale.paid_amount)}</Text>
            </Group>

            <Title order={4}>Товары</Title>

            <ScrollArea>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Товар</Table.Th>
                    <Table.Th>Количество</Table.Th>
                    <Table.Th>Цена</Table.Th>
                    <Table.Th>Сумма</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {(selectedSale.items || []).map((item) => (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.product_name}</Table.Td>
                      <Table.Td>{item.quantity}</Table.Td>
                      <Table.Td>{money(item.unit_price)}</Table.Td>
                      <Table.Td>{money(item.line_total)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {selectedSale.comment && (
              <Text size="sm" c="dimmed">
                Комментарий: {selectedSale.comment}
              </Text>
            )}
          </Stack>
        )}
      </Modal>
    <Modal
  opened={returnOpened}
  onClose={() => setReturnOpened(false)}
  title={`Возврат по продаже #${selectedSale?.id ?? ""}`}
  size="lg"
  centered
>
  <Stack>
    <Select
      label="Склад возврата"
      placeholder="Выбери склад"
      data={warehouses.map((item) => ({
        value: String(item.id),
        label: getLabel(item),
      }))}
      value={returnWarehouse}
      onChange={(value) => setReturnWarehouse(value)}
      searchable
      required
    />

    <Text fw={600}>Товары для возврата</Text>

    {returnLines.map((line, index) => (
      <Card key={line.sale_item} withBorder padding="sm">
        <Stack gap="xs">
          <Text fw={500}>{line.product_name}</Text>

          <Text size="sm" c="dimmed">
            Продано: {line.sold_quantity}
          </Text>

          <NumberInput
            label="Количество к возврату"
            min={0}
            max={line.sold_quantity}
            decimalScale={3}
            value={line.quantity}
            onChange={(value) => {
              const quantity = Number(value) || 0;

              setReturnLines((previous) =>
                previous.map((item, i) =>
                  i === index
                    ? {
                        ...item,
                        quantity: Math.min(
                          Math.max(0, quantity),
                          item.sold_quantity,
                        ),
                      }
                    : item,
                ),
              );
            }}
          />
        </Stack>
      </Card>
    ))}

    <Textarea
      label="Причина возврата"
      placeholder="Укажи причину возврата..."
      value={returnReason}
      onChange={(event) =>
        setReturnReason(event.currentTarget.value)
      }
    />

    {error && (
      <Alert color="red" title="Ошибка возврата">
        {error}
      </Alert>
    )}

    <Group justify="flex-end">
      <Button
        variant="default"
        onClick={() => setReturnOpened(false)}
      >
        Отмена
      </Button>

      <Button
        color="orange"
        loading={saving}
        onClick={() => void createReturn()}
      >
        Оформить возврат
      </Button>
    </Group>
  </Stack>
</Modal>
    </Stack>
  );
}

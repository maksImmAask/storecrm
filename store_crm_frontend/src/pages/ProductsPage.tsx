
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  ScrollArea,
  Table,
  Text,
  TextInput,
  Stack,
  Title,
} from "@mantine/core";

import {
  IconAlertTriangle,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
} from "@tabler/icons-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../api/client";
import ProductFormModal, {
  type Product,
} from "../components/ProductFormModal";

function getProducts(data: unknown): Product[] {
  let items: unknown = data;

  if (typeof data === "object" && data !== null) {
    const object = data as Record<string, unknown>;

    if (Array.isArray(object.results)) {
      items = object.results;
    } else if (Array.isArray(object.data)) {
      items = object.data;
    }
  }

  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(
    (item): item is Product =>
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "name" in item,
  );
}

function getApiError(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
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
        const message = Array.isArray(firstField[1])
          ? firstField[1].join(", ")
          : String(firstField[1]);

        return `${firstField[0]}: ${message}`;
      }
    }
  }

  return "Не удалось выполнить запрос. Проверьте сервер и подключение.";
}

function formatPrice(value: string | number): string {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(number)} сум`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");

  const [modalOpened, setModalOpened] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(
    null,
  );

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/products/");
      setProducts(getProducts(response.data));
    } catch (err: unknown) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return products;
    }

    return products.filter((product) =>
      [
        product.name,
        product.sku,
        product.barcode,
        product.price,
      ]
        .map(String)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [products, search]);

  function openCreateModal() {
    setSelectedProduct(null);
    setFormError("");
    setModalOpened(true);
  }

  function openEditModal(product: Product) {
    setSelectedProduct(product);
    setFormError("");
    setModalOpened(true);
  }

  async function handleSave(product: Product) {
    setSaving(true);
    setFormError("");

    try {
      const payload = {
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: Number(product.price),
      };

      if (selectedProduct?.id !== undefined) {
        await api.patch(`/products/${selectedProduct.id}/`, payload);
      } else {
        await api.post("/products/", payload);
      }

      setModalOpened(false);
      setSelectedProduct(null);

      await loadProducts();
    } catch (err: unknown) {
      setFormError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Удалить товар «${product.name}»?`,
    );

    if (!confirmed || product.id === undefined) {
      return;
    }

    setError("");

    try {
      await api.delete(`/products/${product.id}/`);

      setProducts((current) =>
        current.filter((item) => item.id !== product.id),
      );
    } catch (err: unknown) {
      setError(getApiError(err));
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={3}>Товары</Title>
          <Text c="dimmed" size="sm" mt={4}>
            Управление каталогом товаров компании
          </Text>
        </div>

        <Group>
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void loadProducts()}
            loading={loading}
          >
            Обновить
          </Button>

          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreateModal}
          >
            Добавить товар
          </Button>
        </Group>
      </Group>

      {error && (
        <Alert
          color="red"
          icon={<IconAlertTriangle size={18} />}
          title="Ошибка"
          withCloseButton
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      <Card withBorder radius="lg" padding="md">
        <Group justify="space-between" mb="md">
          <Title order={4}>Каталог</Title>

          <Badge size="lg" variant="light">
            {filteredProducts.length} товаров
          </Badge>
        </Group>

        <TextInput
          placeholder="Поиск по названию, артикулу или штрихкоду"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          mb="md"
        />

        {loading ? (
          <Group justify="center" py="xl">
            <Loader />
            <Text c="dimmed">Загружаем товары...</Text>
          </Group>
        ) : (
          <ScrollArea>
            <Table
              striped
              highlightOnHover
              withTableBorder
              withColumnBorders
              miw={800}
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>ID</Table.Th>
                  <Table.Th>Название</Table.Th>
                  <Table.Th>Артикул</Table.Th>
                  <Table.Th>Штрихкод</Table.Th>
                  <Table.Th>Цена</Table.Th>
                  <Table.Th>Действия</Table.Th>
                </Table.Tr>
              </Table.Thead>

              <Table.Tbody>
                {filteredProducts.map((product) => (
                  <Table.Tr key={product.id}>
                    <Table.Td>{product.id}</Table.Td>
                    <Table.Td>
                      <Text fw={500}>{product.name}</Text>
                    </Table.Td>
                    <Table.Td>{product.sku || "—"}</Table.Td>
                    <Table.Td>{product.barcode || "—"}</Table.Td>
                    <Table.Td>{formatPrice(product.price)}</Table.Td>
                    <Table.Td>
                      <Group gap="xs" wrap="nowrap">
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconEdit size={14} />}
                          onClick={() => openEditModal(product)}
                        >
                          Изменить
                        </Button>

                        <Button
                          variant="light"
                          color="red"
                          size="xs"
                          leftSection={<IconTrash size={14} />}
                          onClick={() => void handleDelete(product)}
                        >
                          Удалить
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}

                {filteredProducts.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center" py="xl">
                        {search
                          ? "По вашему запросу ничего не найдено."
                          : "Товаров пока нет. Добавьте первый товар."}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        )}

        <Text c="dimmed" size="xs" mt="md">
          Всего в каталоге: {products.length}
        </Text>
      </Card>

      <ProductFormModal
        opened={modalOpened}
        product={selectedProduct}
        loading={saving}
        error={formError}
        onClose={() => setModalOpened(false)}
        onSubmit={handleSave}
      />
    </Stack>
  );
}

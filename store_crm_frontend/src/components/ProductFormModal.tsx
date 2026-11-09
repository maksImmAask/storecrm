import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  TextInput,
  Textarea,
  Loader,
  Text,
} from "@mantine/core";

import { useEffect, useState } from "react";
import api from "../api/client";

export interface Product {
  id?: number | string;
  name: string;
  sku: string;
  barcode: string;
  category: number | string;
  category_name?: string;
  purchase_price: string | number;
  sale_price: string | number;
  description?: string;
  is_active?: boolean;
}

interface CategoryOption {
  value: string;
  label: string;
}

interface ProductFormModalProps {
  opened: boolean;
  product: Product | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (product: Product) => Promise<void>;
}

const emptyProduct: Product = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  purchase_price: "",
  sale_price: "",
  description: "",
};

function getCategories(data: unknown): CategoryOption[] {
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

  return items
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "name" in item,
    )
    .map((item) => ({
      value: String(item.id),
      label: String(item.name),
    }));
}

export default function ProductFormModal({
  opened,
  product,
  loading,
  error,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const [form, setForm] = useState<Product>(emptyProduct);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!opened) return;

    setForm(
      product
        ? {
            ...emptyProduct,
            ...product,
            category: product.category
              ? String(product.category)
              : "",
          }
        : { ...emptyProduct },
    );

    setValidationError("");
    setCategoriesError("");

    let cancelled = false;

    async function loadCategories() {
      setCategoriesLoading(true);

      try {
        const response = await api.get("/categories/");

        if (!cancelled) {
          setCategories(getCategories(response.data));
        }
      } catch {
        if (!cancelled) {
          setCategoriesError("Не удалось загрузить категории.");
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    }

    void loadCategories();

    return () => {
      cancelled = true;
    };
  }, [opened, product]);

  function updateField<K extends keyof Product>(
    key: K,
    value: Product[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setValidationError("");

    if (!form.name.trim()) {
      setValidationError("Введите название товара.");
      return;
    }

    if (!form.category) {
      setValidationError("Выберите категорию товара.");
      return;
    }

    if (
      form.purchase_price === "" ||
      Number(form.purchase_price) < 0
    ) {
      setValidationError("Введите корректную закупочную цену.");
      return;
    }

    if (
      form.sale_price === "" ||
      Number(form.sale_price) < 0
    ) {
      setValidationError("Введите корректную продажную цену.");
      return;
    }

    await onSubmit({
      ...form,
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      category: Number(form.category),
      purchase_price: Number(form.purchase_price),
      sale_price: Number(form.sale_price),
      description: form.description?.trim() || "",
    });
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={product ? "Редактировать товар" : "Новый товар"}
      centered
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          {validationError && (
            <Alert color="red">{validationError}</Alert>
          )}

          {error && (
            <Alert color="red" title="Ошибка сохранения">
              {error}
            </Alert>
          )}

          {categoriesError && (
            <Alert color="red">{categoriesError}</Alert>
          )}

          <TextInput
            label="Название товара"
            placeholder="Например, Ноутбук Lenovo"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.currentTarget.value)
            }
            required
          />

          <Select
            label="Категория"
            placeholder="Выберите категорию"
            data={categories}
            value={form.category ? String(form.category) : null}
            onChange={(value) =>
              updateField("category", value ?? "")
            }
            searchable
            nothingFoundMessage="Категории не найдены"
            disabled={categoriesLoading}
            rightSection={
              categoriesLoading ? <Loader size="xs" /> : undefined
            }
            required
          />

          {!categoriesLoading && categories.length === 0 && (
            <Alert color="yellow" title="Нет категорий">
              Сначала создайте категорию в разделе «Категории товаров»,
              затем вернитесь к созданию товара.
            </Alert>
          )}

          <TextInput
            label="Артикул (SKU)"
            placeholder="Например, LEN-001"
            value={form.sku}
            onChange={(event) =>
              updateField("sku", event.currentTarget.value)
            }
          />

          <TextInput
            label="Штрихкод"
            placeholder="Введите штрихкод"
            value={form.barcode}
            onChange={(event) =>
              updateField("barcode", event.currentTarget.value)
            }
          />

          <NumberInput
            label="Закупочная цена"
            placeholder="0"
            min={0}
            decimalScale={2}
            value={form.purchase_price}
            onChange={(value) =>
              updateField("purchase_price", value)
            }
            required
          />

          <NumberInput
            label="Продажная цена"
            placeholder="0"
            min={0}
            decimalScale={2}
            value={form.sale_price}
            onChange={(value) =>
              updateField("sale_price", value)
            }
            required
          />

          <Textarea
            label="Описание"
            placeholder="Дополнительная информация о товаре"
            value={form.description ?? ""}
            onChange={(event) =>
              updateField("description", event.currentTarget.value)
            }
            autosize
            minRows={2}
          />

          {categories.length === 0 && !categoriesLoading && (
            <Text size="xs" c="dimmed">
              Создание товара станет доступно после добавления категории.
            </Text>
          )}

          <Group justify="flex-end" mt="md">
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </Button>

            <Button
              type="submit"
              loading={loading}
              disabled={
                categoriesLoading ||
                categories.length === 0 ||
                Boolean(categoriesError)
              }
            >
              {product ? "Сохранить изменения" : "Создать товар"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
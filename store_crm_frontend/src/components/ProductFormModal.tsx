
import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  Stack,
  TextInput,
} from "@mantine/core";

import { useEffect, useState } from "react";

export interface Product {
  id?: number | string;
  name: string;
  sku: string;
  barcode: string;
  price: string | number;
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
  price: "",
};

export default function ProductFormModal({
  opened,
  product,
  loading,
  error,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const [form, setForm] = useState<Product>(emptyProduct);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (opened) {
      setForm(product ? { ...product } : { ...emptyProduct });
      setValidationError("");
    }
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");

    if (!form.name.trim()) {
      setValidationError("Введите название товара.");
      return;
    }

    if (form.price === "" || Number(form.price) < 0) {
      setValidationError("Введите корректную цену.");
      return;
    }

    await onSubmit({
      ...form,
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim(),
      price: Number(form.price),
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

          <TextInput
            label="Название товара"
            placeholder="Например, Ноутбук Lenovo"
            value={form.name}
            onChange={(event) =>
              updateField("name", event.currentTarget.value)
            }
            required
          />

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
            label="Цена"
            placeholder="0"
            min={0}
            decimalScale={2}
            value={form.price}
            onChange={(value) => updateField("price", value)}
            required
          />

          <Group justify="flex-end" mt="md">
            <Button
              type="button"
              variant="default"
              onClick={onClose}
              disabled={loading}
            >
              Отмена
            </Button>

            <Button type="submit" loading={loading}>
              {product ? "Сохранить изменения" : "Создать товар"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

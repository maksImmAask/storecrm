
import {
  Alert,
  Card,
  Grid,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";

import {
  IconCash,
  IconChartLine,
  IconUsers,
  IconReceipt,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react";

import { useCallback, useEffect, useState } from "react";
import api from "../api/client";

interface DashboardData {
  [key: string]: unknown;
}

interface Metric {
  title: string;
  value: string;
  description: string;
  icon: typeof IconCash;
  color: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat("ru-RU", {
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function getNumber(data: DashboardData, keys: string[]): number | null {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function formatMoney(value: number | null): string {
  if (value === null) {
    return "—";
  }

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value)} сум`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/dashboard/");

      const result = response.data;

      if (result && typeof result === "object" && !Array.isArray(result)) {
        setData(result as DashboardData);
      } else {
        setData({ result });
      }
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err
          ? "Не удалось загрузить статистику. Проверьте доступ к API."
          : "Не удалось подключиться к серверу.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const revenue = data
    ? getNumber(data, ["today_revenue", "revenue_today", "today_sales"])
    : null;

  const monthRevenue = data
    ? getNumber(data, ["month_revenue", "revenue_month", "monthly_revenue"])
    : null;

  const customers = data
    ? getNumber(data, ["customers_count", "total_customers", "customers"])
    : null;

  const sales = data
    ? getNumber(data, ["today_checks", "checks_today", "today_sales_count"])
    : null;

  const metrics: Metric[] = [
    {
      title: "Выручка сегодня",
      value: formatMoney(revenue),
      description: "За текущий день",
      icon: IconCash,
      color: "green",
    },
    {
      title: "Выручка за месяц",
      value: formatMoney(monthRevenue),
      description: "За текущий месяц",
      icon: IconChartLine,
      color: "blue",
    },
    {
      title: "Клиенты",
      value: customers === null ? "—" : formatValue(customers),
      description: "По данным API",
      icon: IconUsers,
      color: "violet",
    },
    {
      title: "Продажи сегодня",
      value: sales === null ? "—" : formatValue(sales),
      description: "Количество чеков",
      icon: IconReceipt,
      color: "orange",
    },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={3}>Обзор бизнеса</Title>
          <Text c="dimmed" size="sm">
            Основные показатели вашей компании
          </Text>
        </div>

        <Group gap="xs">
          <IconRefresh size={17} />
          <Text
            size="sm"
            c="blue"
            style={{ cursor: "pointer" }}
            onClick={() => void loadDashboard()}
          >
            Обновить
          </Text>
        </Group>
      </Group>

      {error && (
        <Alert
          icon={<IconAlertTriangle size={18} />}
          title="Ошибка загрузки"
          color="red"
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <Group justify="center" py="xl">
          <Loader />
          <Text c="dimmed">Загружаем статистику...</Text>
        </Group>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }}>
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <Card key={metric.title} withBorder radius="lg" padding="lg">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text size="sm" c="dimmed">
                      {metric.title}
                    </Text>

                    <Title order={3} mt="sm">
                      {metric.value}
                    </Title>
                  </div>

                  <ThemeIcon
                    size="xl"
                    radius="md"
                    variant="light"
                    color={metric.color}
                  >
                    <Icon size={22} />
                  </ThemeIcon>
                </Group>

                <Text size="xs" c="dimmed" mt="md">
                  {metric.description}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>
      )}

      <Grid>
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Title order={4} mb="md">
              Статистика API
            </Title>

            {data && Object.keys(data).length > 0 ? (
              <Stack gap="sm">
                {Object.entries(data).map(([key, value]) => (
                  <Group
                    key={key}
                    justify="space-between"
                    align="flex-start"
                  >
                    <Text size="sm" c="dimmed">
                      {key.replaceAll("_", " ")}
                    </Text>

                    <Text size="sm" fw={600} ta="right">
                      {formatValue(value)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" size="sm">
                Данные появятся после загрузки статистики.
              </Text>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Title order={4} mb="md">
              Состояние системы
            </Title>

            <Stack gap="md">
              <Group justify="space-between">
                <Text size="sm">Frontend</Text>
                <Text size="sm" c="green" fw={600}>
                  Запущен
                </Text>
              </Group>

              <Group justify="space-between">
                <Text size="sm">Авторизация</Text>
                <Text size="sm" c="green" fw={600}>
                  Выполнена
                </Text>
              </Group>

              <Group justify="space-between">
                <Text size="sm">API статистики</Text>
                <Text
                  size="sm"
                  c={error ? "red" : data ? "green" : "dimmed"}
                  fw={600}
                >
                  {error ? "Ошибка" : data ? "Доступен" : "Нет данных"}
                </Text>
              </Group>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

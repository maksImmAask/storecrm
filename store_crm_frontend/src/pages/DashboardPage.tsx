import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  Button,
  Grid,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconCash,
  IconChartBar,
  IconRefresh,
  IconReceipt,
  IconShoppingCart,
  IconTrendingUp,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react";

import api from "../api/client";

interface DashboardData {
  date: string;
  sales_today: {
    revenue: number | string;
    checks: number;
  };
  sales_month: {
    revenue: number | string;
    checks: number;
  };
  average_check_today: number | string;
  expenses_month: number | string;
  revenue_minus_expenses_month: number | string;
  customers_with_debt: number;
  stock_without_available_quantity: number;
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  color: "blue" | "green" | "orange" | "red" | "teal" | "violet";
}

function formatMoney(value: number | string): string {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0) + " сум";
}

function formatDate(value: string): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function MetricCard({
  title,
  value,
  description,
  icon,
  color,
}: MetricCardProps) {
  return (
    <Paper withBorder shadow="xs" radius="md" p="lg">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={5}>
          <Text size="sm" c="dimmed" fw={500}>
            {title}
          </Text>

          <Text fw={700} size="xl">
            {value}
          </Text>

          <Text size="xs" c="dimmed">
            {description}
          </Text>
        </Stack>

        <ThemeIcon size={48} radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<DashboardData>("/dashboard/");

      setData(response.data);
    } catch (err: unknown) {
      console.error("Dashboard loading error:", err);
      setError("Не удалось загрузить статистику. Проверьте подключение к серверу.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading && !data) {
    return (
      <Stack align="center" justify="center" py={100}>
        <Loader size="lg" />
        <Text c="dimmed">Загрузка статистики...</Text>
      </Stack>
    );
  }

  if (error && !data) {
    return (
      <Stack>
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>

        <Button
          leftSection={<IconRefresh size={16} />}
          onClick={() => void loadDashboard()}
          w="fit-content"
        >
          Повторить
        </Button>
      </Stack>
    );
  }

  if (!data) return null;

  const profit = Number(data.revenue_minus_expenses_month);
  const profitColor = profit >= 0 ? "green" : "red";

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Stack gap={3}>
          <Title order={2}>Главная панель</Title>
          <Text c="dimmed" size="sm">
            Обзор работы магазина на {formatDate(data.date)}
          </Text>
        </Stack>

        <Button
          variant="light"
          leftSection={<IconRefresh size={16} />}
          onClick={() => void loadDashboard()}
          loading={loading}
        >
          Обновить
        </Button>
      </Group>

      {error && (
        <Alert color="red" title="Не удалось обновить данные">
          {error}
        </Alert>
      )}

      <div>
        <Title order={4} mb="md">
          Продажи
        </Title>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <MetricCard
            title="Выручка сегодня"
            value={formatMoney(data.sales_today.revenue)}
            description="За текущий день"
            icon={<IconCash size={25} />}
            color="green"
          />

          <MetricCard
            title="Количество продаж"
            value={String(data.sales_today.checks)}
            description="Чеков за сегодня"
            icon={<IconShoppingCart size={25} />}
            color="blue"
          />

          <MetricCard
            title="Выручка за месяц"
            value={formatMoney(data.sales_month.revenue)}
            description={`${data.sales_month.checks} чеков за месяц`}
            icon={<IconChartBar size={25} />}
            color="violet"
          />

          <MetricCard
            title="Средний чек"
            value={formatMoney(data.average_check_today)}
            description="Средняя сумма продажи сегодня"
            icon={<IconTrendingUp size={25} />}
            color="teal"
          />
        </SimpleGrid>
      </div>

      <div>
        <Title order={4} mb="md">
          Финансы и склад
        </Title>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <MetricCard
            title="Расходы за месяц"
            value={formatMoney(data.expenses_month)}
            description="Все расходы с начала месяца"
            icon={<IconReceipt size={25} />}
            color="orange"
          />

          <MetricCard
            title="Выручка минус расходы"
            value={formatMoney(data.revenue_minus_expenses_month)}
            description="За текущий месяц"
            icon={<IconWallet size={25} />}
            color={profit >= 0 ? "green" : "red"}
          />

          <MetricCard
            title="Клиенты с долгами"
            value={String(data.customers_with_debt)}
            description="Клиенты с положительным балансом"
            icon={<IconUsers size={25} />}
            color="orange"
          />

          <MetricCard
            title="Нет доступного остатка"
            value={String(data.stock_without_available_quantity)}
            description="Позиции, где весь товар зарезервирован или отсутствует"
            icon={<IconAlertTriangle size={25} />}
            color="red"
          />
        </SimpleGrid>
      </div>

      <Paper withBorder radius="md" p="lg">
        <Title order={4} mb="md">
          Финансовый результат за месяц
        </Title>

        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text size="sm" c="dimmed">
              Выручка
            </Text>
            <Text fw={700} size="xl" c="green">
              {formatMoney(data.sales_month.revenue)}
            </Text>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Text size="sm" c="dimmed">
              Расходы
            </Text>
            <Text fw={700} size="xl" c="orange">
              {formatMoney(data.expenses_month)}
            </Text>
          </Grid.Col>
        </Grid>

        <Group justify="space-between" mt="lg">
          <Text fw={600}>Разница</Text>
          <Text fw={700} size="lg" c={profitColor}>
            {formatMoney(data.revenue_minus_expenses_month)}
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
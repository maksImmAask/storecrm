
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Text,
  Title,
  Button,
  Avatar,
  Stack,
  Divider,
} from "@mantine/core";

import {
  IconLayoutDashboard,
  IconBuildingStore,
  IconPackages,
  IconBuildingWarehouse,
  IconShoppingCart,
  IconUsers,
  IconChartBar,
  IconReceiptRefund,
  IconLogout,
  IconTruck,
  IconWallet,
} from "@tabler/icons-react";

import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuthStore } from "../store/authStore";

const navigation = [
  {
    label: "Главная",
    description: "Обзор бизнеса",
    icon: IconLayoutDashboard,
    path: "/",
  },
  {
    label: "Филиалы",
    icon: IconBuildingStore,
    path: "/branches",
  },
  {
    label: "Товары",
    icon: IconPackages,
    path: "/products",
  },
  {
    label: "Склады",
    icon: IconBuildingWarehouse,
    path: "/warehouses",
  },
  {
    label: "Продажи",
    icon: IconShoppingCart,
    path: "/sales",
  },
  {
    label: "Клиенты",
    icon: IconUsers,
    path: "/customers",
  },
  {
    label: "Поставщики",
    icon: IconTruck,
    path: "/suppliers",
  },
  {
    label: "Финансы",
    icon: IconWallet,
    path: "/finance",
  },
  {
    label: "Отчёты",
    icon: IconChartBar,
    path: "/reports",
  },
  {
  label: "Остатки",
  icon: IconPackages,
  path: "/stock",
},{
  label: "Возвраты",
  icon: IconReceiptRefund,
  path: "/returns",
},
];

export default function AppLayout() {
  const [opened, setOpened] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const logout = useAuthStore((state) => state.logout);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  const currentPage =
    navigation.find((item) => item.path === location.pathname)?.label ??
    "CRM";

  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="lg"
    >
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={() => setOpened((value) => !value)}
              hiddenFrom="sm"
              size="sm"
            />

            <Avatar radius="md" color="blue">
              CRM
            </Avatar>

            <div>
              <Title order={4}>Store CRM</Title>
              <Text size="xs" c="dimmed">
                Управление сетью магазинов
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <Text visibleFrom="sm" size="sm">
              Панель управления
            </Text>

            <Button
              variant="light"
              color="red"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
            >
              Выйти
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap={4}>
          <Text size="xs" fw={700} c="dimmed" mb="xs">
            ОСНОВНОЕ МЕНЮ
          </Text>

          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                label={item.label}
                leftSection={<Icon size={19} />}
                active={
                  item.path === "/"
                    ? location.pathname === "/"
                    : location.pathname.startsWith(item.path)
                }
                onClick={() => {
                  navigate(item.path);
                  setOpened(false);
                }}
                variant="light"
              />
            );
          })}
        </Stack>

        <div style={{ marginTop: "auto" }}>
          <Divider my="md" />

          <Text size="xs" c="dimmed">
            Store CRM
          </Text>

          <Text size="xs" c="dimmed">
            Система управления магазином
          </Text>
        </div>
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="lg">
          <div>
            <Title order={2}>{currentPage}</Title>
            <Text size="sm" c="dimmed">
              Управление бизнес-процессами компании
            </Text>
          </div>

          <Outlet />
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}

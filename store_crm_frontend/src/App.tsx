
import "@mantine/core/styles.css";

import {
  MantineProvider,
  createTheme,
  Center,
  Loader,
} from "@mantine/core";

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import ReturnsPage from "./pages/ReturnsPage";
import SalesPage from "./pages/SalesPage";
import CustomersPage from "./pages/CustomersPage";
import SuppliersPage from "./pages/SuppliersPage";
import ApiDataPage from "./components/ApiDataPage";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EntityListPage from "./pages/EntityListPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./layouts/AppLayout";
import NotFoundPage from "./pages/NotFoundPage";
import ProductsPage from "./pages/ProductsPage";
const theme = createTheme({
  primaryColor: "blue",
  defaultRadius: "md",
  fontFamily: "Inter, system-ui, sans-serif",
  headings: {
    fontFamily: "Inter, system-ui, sans-serif",
  },
});

import StockPage from "./pages/StockPage";
function LoginRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();
  const location = useLocation();

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = () => {
    const state = location.state as { from?: string } | null;
    navigate(state?.from || "/", { replace: true });
  };

  return <LoginPage onLogin={handleLogin} />;
}

function AppRoutes() {
  const accessToken = useAuthStore((state) => state.accessToken);

  if (accessToken === undefined) {
    return (
      <Center mih="100vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />

          <Route
            path="branches"
            element={
              <EntityListPage
                title="Филиалы"
                description="Филиалы вашей компании"
                endpoint="/branches/"
                columns={[
                  { key: "id", label: "ID" },
                  { key: "name", label: "Название" },
                  { key: "address", label: "Адрес" },
                  { key: "phone", label: "Телефон" },
                ]}
              />
            }
          />

          <Route path="products" element={<ProductsPage />} />

          <Route
            path="warehouses"
            element={
              <EntityListPage
                title="Склады"
                description="Склады и места хранения"
                endpoint="/warehouses/"
                columns={[
                  { key: "id", label: "ID" },
                  { key: "name", label: "Название" },
                  { key: "branch", label: "Филиал" },
                  { key: "address", label: "Адрес" },
                ]}
              />
            }
          />

          <Route path="customers" element={<CustomersPage />} />

<Route path="suppliers" element={<SuppliersPage />} />

<Route path="sales" element={<SalesPage />} />
<Route path="returns" element={<ReturnsPage />} />

<Route
  path="debts"
  element={
    <ApiDataPage
      title="Задолженности"
      description="Просмотр долгов и состояния оплаты."
      endpoint="/debts/"
    />
  }
/>

          <Route
            path="finance"
            element={
              <EntityListPage
                title="Финансы"
                description="Долги клиентов"
                endpoint="/debts/"
                columns={[
                  { key: "id", label: "ID" },
                  { key: "customer", label: "Клиент" },
                  { key: "amount", label: "Сумма долга" },
                  { key: "status", label: "Статус" },
                ]}
              />
            }
          />
          <Route path="stock" element={<StockPage />} />

          <Route
            path="reports"
            element={
              <EntityListPage
                title="Отчёты по продажам"
                description="Сводная информация по филиалам"
                endpoint="/reports/sales/"
                columns={[
                  { key: "branch", label: "Филиал" },
                  { key: "total_sales", label: "Количество продаж" },
                  { key: "total_revenue", label: "Выручка" },
                ]}
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </MantineProvider>
  );
}

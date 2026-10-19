from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)
from rest_framework.routers import DefaultRouter

from apps.branches.views import BranchViewSet, UserBranchRoleViewSet
from apps.companies.views import CompanyViewSet
from apps.products.views import CategoryViewSet, ProductViewSet
from apps.suppliers.views import SupplierViewSet
from apps.customers.views import CustomerViewSet
from apps.sales.views import SaleViewSet
from apps.warehouse.views import (
    StockMovementViewSet,
    StockReceiptViewSet,
    StockViewSet,
    WarehouseViewSet,
)
from apps.sales.return_views import SaleReturnViewSet
from apps.audit.views import AuditLogViewSet
from apps.finance.views import ExpenseCategoryViewSet, ExpenseViewSet
from apps.customers.debt_views import DebtViewSet
from apps.notifications.views import NotificationViewSet
from apps.reports.views import (
    DashboardView,
    SalesReportView,
    StockReportView,
)
from apps.warehouse.transfer_views import StockTransferViewSet

router = DefaultRouter()

router.register("companies", CompanyViewSet, basename="company")
router.register("branches", BranchViewSet, basename="branch")
router.register("branch-roles", UserBranchRoleViewSet, basename="branch-role")
router.register("categories", CategoryViewSet, basename="category")
router.register("products", ProductViewSet, basename="product")
router.register("suppliers", SupplierViewSet, basename="supplier")
router.register("customers", CustomerViewSet, basename="customer")
router.register("warehouses", WarehouseViewSet, basename="warehouse")
router.register("stock", StockViewSet, basename="stock")
router.register("sale-returns", SaleReturnViewSet, basename="sale-return")
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register(
    "stock-movements",
    StockMovementViewSet,
    basename="stock-movement",
)
router.register(
    "stock-receipts",
    StockReceiptViewSet,
    basename="stock-receipt",
)
router.register("sales", SaleViewSet, basename="sale")


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/dashboard/", DashboardView.as_view(), name="dashboard"),
    path("api/reports/sales/", SalesReportView.as_view(), name="sales-report"),
    path("api/reports/stock/", StockReportView.as_view(), name="stock-report"),
]
router.register("expenses", ExpenseViewSet, basename="expense")
router.register(
    "expense-categories",
    ExpenseCategoryViewSet,
    basename="expense-category",
)
router.register("debts", DebtViewSet, basename="debt")
router.register(
    "notifications",
    NotificationViewSet,
    basename="notification",
)
router.register(
    "stock-transfers",
    StockTransferViewSet,
    basename="stock-transfer",
)
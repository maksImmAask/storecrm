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
]
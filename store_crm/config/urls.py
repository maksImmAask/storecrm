from django.contrib import admin
from django.urls import include, path

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
)

from rest_framework.routers import DefaultRouter

from apps.branches.views import (
    BranchViewSet,
    UserBranchRoleViewSet,
)

from apps.companies.views import CompanyViewSet

from apps.products.views import (
    CategoryViewSet,
    ProductViewSet,
)


router = DefaultRouter()

router.register(
    "companies",
    CompanyViewSet,
    basename="company",
)

router.register(
    "branches",
    BranchViewSet,
    basename="branch",
)

router.register(
    "branch-roles",
    UserBranchRoleViewSet,
    basename="branch-role",
)

router.register(
    "categories",
    CategoryViewSet,
    basename="category",
)

router.register(
    "products",
    ProductViewSet,
    basename="product",
)


urlpatterns = [
    path(
        "admin/",
        admin.site.urls,
    ),

    path(
        "api/auth/",
        include("apps.users.urls"),
    ),

    path(
        "api/",
        include(router.urls),
    ),

    path(
        "api/schema/",
        SpectacularAPIView.as_view(),
        name="schema",
    ),

    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(
            url_name="schema",
        ),
        name="swagger-ui",
    ),
]
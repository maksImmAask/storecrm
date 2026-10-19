from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Sum, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.customers.models import Customer
from apps.finance.models import Expense
from apps.sales.models import Sale
from apps.warehouse.models import Stock


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        month_start = today.replace(day=1)

        company_filter = {
            "branch__company__owner": request.user,
            "status": Sale.Status.COMPLETED,
        }

        today_sales = Sale.objects.filter(
            **company_filter,
            completed_at__date=today,
        )

        month_sales = Sale.objects.filter(
            **company_filter,
            completed_at__date__gte=month_start,
            completed_at__date__lte=today,
        )

        today_total = today_sales.aggregate(
            total=Sum("total_amount"),
            checks=Count("id"),
        )

        month_total = month_sales.aggregate(
            total=Sum("total_amount"),
            checks=Count("id"),
        )

        expenses = Expense.objects.filter(
            company__owner=request.user,
            expense_date__gte=month_start,
            expense_date__lte=today,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0.00")

        stock_queryset = Stock.objects.filter(
            warehouse__branch__company__owner=request.user,
        ).select_related("product", "warehouse")

        low_stock = stock_queryset.filter(
            quantity__lte=F("reserved_quantity")
        ).count()

        customers_with_debt = Customer.objects.filter(
            company__owner=request.user,
            balance__gt=0,
        ).count()

        today_revenue = today_total["total"] or Decimal("0.00")
        month_revenue = month_total["total"] or Decimal("0.00")

        return Response({
            "date": today,
            "sales_today": {
                "revenue": today_revenue,
                "checks": today_total["checks"] or 0,
            },
            "sales_month": {
                "revenue": month_revenue,
                "checks": month_total["checks"] or 0,
            },
            "average_check_today": (
                today_revenue / today_total["checks"]
                if today_total["checks"]
                else Decimal("0.00")
            ),
            "expenses_month": expenses,
            "revenue_minus_expenses_month": month_revenue - expenses,
            "customers_with_debt": customers_with_debt,
            "stock_without_available_quantity": low_stock,
        })


class SalesReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Sale.objects.filter(
            branch__company__owner=request.user,
            status=Sale.Status.COMPLETED,
        )

        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        branch_id = request.query_params.get("branch")

        if date_from:
            queryset = queryset.filter(
                completed_at__date__gte=date_from,
            )

        if date_to:
            queryset = queryset.filter(
                completed_at__date__lte=date_to,
            )

        if branch_id:
            queryset = queryset.filter(branch_id=branch_id)

        rows = (
            queryset.values("branch_id", "branch__name")
            .annotate(
                checks=Count("id"),
                revenue=Sum("total_amount"),
            )
            .order_by("branch__name")
        )

        return Response(list(rows))


class StockReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = Stock.objects.filter(
            warehouse__branch__company__owner=request.user,
        ).select_related("warehouse", "product")

        warehouse_id = request.query_params.get("warehouse")
        if warehouse_id:
            queryset = queryset.filter(warehouse_id=warehouse_id)

        data = [
            {
                "warehouse": stock.warehouse.name,
                "product_id": stock.product_id,
                "product": stock.product.name,
                "quantity": stock.quantity,
                "reserved_quantity": stock.reserved_quantity,
                "available_quantity": stock.available_quantity,
            }
            for stock in queryset
        ]

        return Response(data)
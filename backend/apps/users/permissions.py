"""
StockRoom RBAC Permission Classes
Enforced on every DRF endpoint per the RBAC matrix in the spec.

Role Matrix:
                   Dashboard | Product/Supplier CRUD | POS & Checkout | Financial Reports | Audit Logs
Admin              Full      | Full                  | Full           | Full              | Full
Manager            Full      | Create/Edit/View      | Full           | View only         | No access
Sales Staff        POS view  | View only             | Process sales  | No access         | No access
"""

from rest_framework.permissions import BasePermission
from .models import UserRole


class IsAdmin(BasePermission):
    """Only Admin role."""
    message = "Access restricted to administrators."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )


class IsAdminOrManager(BasePermission):
    """Admin or Manager roles."""
    message = "Access restricted to administrators and managers."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [UserRole.ADMIN, UserRole.MANAGER]
        )


class IsAdminOrManagerReadOnly(BasePermission):
    """
    Admin: full CRUD
    Manager: Create/Edit/View (no delete)
    Sales Staff: View only (GET, HEAD, OPTIONS)
    """
    message = "Insufficient permissions for this operation."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == UserRole.ADMIN:
            return True

        if request.user.role == UserRole.MANAGER:
            # Managers cannot delete
            if request.method == "DELETE":
                return False
            return True

        # Sales staff: read-only
        if request.user.role == UserRole.SALES_STAFF:
            return request.method in ["GET", "HEAD", "OPTIONS"]

        return False


class CanProcessSales(BasePermission):
    """Admin, Manager, or Sales Staff can process POS sales."""
    message = "You do not have permission to process sales."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in [UserRole.ADMIN, UserRole.MANAGER, UserRole.SALES_STAFF]
        )


class CanViewFinancialReports(BasePermission):
    """Admin (full) and Manager (view only). Sales staff: no access."""
    message = "Access to financial reports is restricted."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if request.user.role == UserRole.ADMIN:
            return True

        if request.user.role == UserRole.MANAGER:
            return request.method in ["GET", "HEAD", "OPTIONS"]

        return False


class CanViewAuditLogs(BasePermission):
    """Only Admin can view audit logs."""
    message = "Audit logs are restricted to administrators."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == UserRole.ADMIN
        )

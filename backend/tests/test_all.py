"""
StockRoom Backend Test Suite
Covers all 8 required test cases from the spec + additional edge cases.

Run with:
    python manage.py test tests
    or
    pytest --ds=config.settings
"""

from decimal import Decimal
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
import threading

from apps.users.models import UserRole
from apps.products.models import Product, Category
from apps.suppliers.models import Supplier
from apps.customers.models import Customer
from apps.inventory.models import StockMovement
from apps.inventory.services import InventoryService, InsufficientStockError

User = get_user_model()


# ─────────────────────────────────────────────
# Fixtures / Helpers
# ─────────────────────────────────────────────

def make_user(email, name, role=UserRole.ADMIN, password="testpass123"):
    return User.objects.create_user(email=email, name=name, role=role, password=password)


def make_product(sku, name, stock=100, min_stock=10, purchase_price=100, selling_price=150, category=None, supplier=None):
    return Product.objects.create(
        sku=sku,
        name=name,
        current_stock=stock,
        minimum_stock=min_stock,
        purchase_price=purchase_price,
        selling_price=selling_price,
        category=category,
        supplier=supplier,
    )


def get_tokens(client, email, password="testpass123"):
    response = client.post("/api/v1/auth/login/", {"email": email, "password": password})
    return response.data.get("access"), response.data.get("refresh")


# ─────────────────────────────────────────────
# 1. JWT Auth Tests
# ─────────────────────────────────────────────

class JWTAuthTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user("admin@test.com", "Admin User", role=UserRole.ADMIN)

    def test_jwt_auth_login_success(self):
        """Valid credentials → 200 with access + refresh tokens and user info."""
        response = self.client.post("/api/v1/auth/login/", {
            "email": "admin@test.com",
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertIn("user", response.data)
        self.assertEqual(response.data["user"]["role"], UserRole.ADMIN)
        self.assertEqual(response.data["user"]["email"], "admin@test.com")

    def test_jwt_auth_login_wrong_password(self):
        """Wrong password → 401."""
        response = self.client.post("/api/v1/auth/login/", {
            "email": "admin@test.com",
            "password": "wrongpassword",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_jwt_auth_login_inactive_user(self):
        """Inactive user → 401."""
        self.admin.is_active = False
        self.admin.save()
        response = self.client.post("/api/v1/auth/login/", {
            "email": "admin@test.com",
            "password": "testpass123",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_access_protected_endpoint_without_token(self):
        """No token → 401 on protected endpoint."""
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        """Valid refresh token → new access token."""
        access, refresh = get_tokens(self.client, "admin@test.com")
        response = self.client.post("/api/v1/auth/token/refresh/", {"refresh": refresh})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_logout_blacklists_refresh_token(self):
        """After logout, refresh token should be invalid."""
        access, refresh = get_tokens(self.client, "admin@test.com")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        self.client.post("/api/v1/auth/logout/", {"refresh": refresh})
        # Try to use the blacklisted token
        response = self.client.post("/api/v1/auth/token/refresh/", {"refresh": refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ─────────────────────────────────────────────
# 2. Product RBAC Tests
# ─────────────────────────────────────────────

class ProductRBACTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user("admin@test.com", "Admin", role=UserRole.ADMIN)
        self.manager = make_user("mgr@test.com", "Manager", role=UserRole.MANAGER)
        self.staff = make_user("staff@test.com", "Staff", role=UserRole.SALES_STAFF)
        self.category = Category.objects.create(name="Electronics")

    def _auth(self, user):
        access, _ = get_tokens(self.client, user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_product_creation_rbac_permission(self):
        """Admin can create products."""
        self._auth(self.admin)
        response = self.client.post("/api/v1/products/", {
            "sku": "TST-001",
            "name": "Test Product",
            "purchase_price": "100.00",
            "selling_price": "150.00",
            "category": self.category.pk,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_manager_can_create_product(self):
        """Manager can also create products."""
        self._auth(self.manager)
        response = self.client.post("/api/v1/products/", {
            "sku": "TST-002",
            "name": "Manager Product",
            "purchase_price": "50.00",
            "selling_price": "80.00",
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_sales_staff_cannot_create_product(self):
        """Sales staff cannot create products — view only."""
        self._auth(self.staff)
        response = self.client.post("/api/v1/products/", {
            "sku": "TST-003",
            "name": "Staff Product",
            "purchase_price": "50.00",
            "selling_price": "80.00",
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_sales_staff_can_read_products(self):
        """Sales staff can read products."""
        self._auth(self.staff)
        response = self.client.get("/api/v1/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_permission_deletion_rejection(self):
        """Manager cannot delete products — only admin can."""
        product = make_product("DEL-001", "Delete Me")
        self._auth(self.manager)
        response = self.client.delete(f"/api/v1/products/{product.pk}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Admin can delete
        self._auth(self.admin)
        response = self.client.delete(f"/api/v1/products/{product.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_audit_logs_admin_only(self):
        """Only admin can view inventory movements (audit logs)."""
        self._auth(self.staff)
        response = self.client.get("/api/v1/inventory/movements/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.manager)
        response = self.client.get("/api/v1/inventory/movements/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self._auth(self.admin)
        response = self.client.get("/api/v1/inventory/movements/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)


# ─────────────────────────────────────────────
# 3. InventoryService Tests
# ─────────────────────────────────────────────

class InventoryServiceTests(TestCase):

    def setUp(self):
        self.admin = make_user("admin@test.com", "Admin", role=UserRole.ADMIN)
        self.supplier = Supplier.objects.create(company_name="Test Supplier")

    def test_purchase_order_stock_increase(self):
        """Purchase → stock increments correctly + ledger row created."""
        product = make_product("INV-001", "Widget", stock=20)
        movement = InventoryService.add_stock(
            product_id=product.pk,
            qty=10,
            ref_type="PURCHASE",
            ref_id="PUR-001",
            user=self.admin,
        )
        product.refresh_from_db()
        self.assertEqual(product.current_stock, 30)
        self.assertEqual(movement.prev_stock, 20)
        self.assertEqual(movement.new_stock, 30)
        self.assertEqual(movement.quantity, 10)
        self.assertEqual(movement.ref_type, "PURCHASE")

    def test_insufficient_stock_rejection(self):
        """Deducting more than available raises InsufficientStockError."""
        product = make_product("INV-002", "Scarce Widget", stock=5)
        with self.assertRaises(InsufficientStockError):
            InventoryService.deduct_stock(
                product_id=product.pk,
                qty=10,
                ref_type="SALE",
                ref_id="INV-001",
                user=self.admin,
            )
        # Stock must remain unchanged after failed deduction
        product.refresh_from_db()
        self.assertEqual(product.current_stock, 5)

    def test_no_negative_stock(self):
        """Stock can never go below zero."""
        product = make_product("INV-003", "Zero Widget", stock=0)
        with self.assertRaises(InsufficientStockError):
            InventoryService.deduct_stock(
                product_id=product.pk,
                qty=1,
                ref_type="SALE",
                ref_id="INV-002",
                user=self.admin,
            )
        product.refresh_from_db()
        self.assertEqual(product.current_stock, 0)

    def test_stock_movement_immutability(self):
        """StockMovement rows cannot be updated after creation."""
        product = make_product("INV-004", "Immutable Widget", stock=10)
        movement = InventoryService.add_stock(
            product_id=product.pk,
            qty=5,
            ref_type="PURCHASE",
            ref_id="PUR-002",
            user=self.admin,
        )
        movement.quantity = 999  # try to modify
        with self.assertRaises(PermissionError):
            movement.save()

    def test_stock_movement_cannot_be_deleted(self):
        """StockMovement rows cannot be deleted."""
        product = make_product("INV-005", "Protected Widget", stock=10)
        movement = InventoryService.add_stock(
            product_id=product.pk,
            qty=5,
            ref_type="PURCHASE",
            ref_id="PUR-003",
            user=self.admin,
        )
        with self.assertRaises(PermissionError):
            movement.delete()

    def test_adjust_stock(self):
        """Manual adjustment sets exact stock level and logs signed delta."""
        product = make_product("INV-006", "Adjustable Widget", stock=50)
        movement = InventoryService.adjust_stock(
            product_id=product.pk,
            new_stock_level=30,
            user=self.admin,
            notes="Stock-take correction",
        )
        product.refresh_from_db()
        self.assertEqual(product.current_stock, 30)
        self.assertEqual(movement.quantity, -20)  # 30 - 50 = -20


# ─────────────────────────────────────────────
# 4. Atomic Checkout Tests
# ─────────────────────────────────────────────

class CheckoutTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user("admin@test.com", "Admin", role=UserRole.ADMIN)
        self.staff = make_user("staff@test.com", "Staff", role=UserRole.SALES_STAFF)
        self.product = make_product("CHK-001", "Checkout Product", stock=50,
                                    purchase_price=100, selling_price=200)

    def _auth(self, user):
        access, _ = get_tokens(self.client, user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_sale_checkout_atomic_decrement(self):
        """Successful checkout: stock decrements + sale + ledger row created."""
        self._auth(self.staff)
        response = self.client.post("/api/v1/sales/checkout/", {
            "items": [{"product": self.product.pk, "quantity": 3, "unit_price": "200.00"}],
            "payment_method": "cash",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("reference", response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 47)
        # Check ledger
        movement = StockMovement.objects.filter(product=self.product, ref_type="SALE").last()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, -3)
        self.assertEqual(movement.prev_stock, 50)
        self.assertEqual(movement.new_stock, 47)

    def test_insufficient_stock_checkout_rejection(self):
        """Checkout with qty > stock → 400, no stock change, no sale created."""
        initial_stock = self.product.current_stock
        sale_count_before = __import__("apps.sales.models", fromlist=["Sale"]).Sale.objects.count()
        self._auth(self.staff)
        response = self.client.post("/api/v1/sales/checkout/", {
            "items": [{"product": self.product.pk, "quantity": 999, "unit_price": "200.00"}],
            "payment_method": "cash",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, initial_stock)
        # No sale created
        from apps.sales.models import Sale
        self.assertEqual(Sale.objects.count(), sale_count_before)

    def test_checkout_with_walk_in_customer(self):
        """Checkout without customer (walk-in) should succeed."""
        self._auth(self.staff)
        response = self.client.post("/api/v1/sales/checkout/", {
            "items": [{"product": self.product.pk, "quantity": 1, "unit_price": "200.00"}],
            "payment_method": "mobile_banking",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data.get("customer"))

    def test_checkout_with_discount(self):
        """Grand total should be reduced by discount."""
        self._auth(self.staff)
        response = self.client.post("/api/v1/sales/checkout/", {
            "items": [{"product": self.product.pk, "quantity": 2, "unit_price": "200.00"}],
            "discount": "50.00",
            "payment_method": "cash",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(response.data["grand_total"]), Decimal("350.00"))  # 400 - 50

    def test_empty_cart_rejected(self):
        """Empty items list → 400."""
        self._auth(self.staff)
        response = self.client.post("/api/v1/sales/checkout/", {
            "items": [],
            "payment_method": "cash",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# 5. Concurrent Sale Row-Locking Test
# ─────────────────────────────────────────────

class ConcurrentSaleTest(TransactionTestCase):
    """
    Uses TransactionTestCase so real DB transactions and row-level locks work.
    Two threads simultaneously try to buy the last item.
    Exactly one should succeed; the other should get 400.
    """

    def setUp(self):
        self.admin = make_user("admin@test.com", "Admin", role=UserRole.ADMIN)
        self.staff1 = make_user("staff1@test.com", "Staff1", role=UserRole.SALES_STAFF)
        self.staff2 = make_user("staff2@test.com", "Staff2", role=UserRole.SALES_STAFF)
        # Only 1 unit available
        self.product = make_product("CONC-001", "Last Item", stock=1)

    def test_concurrent_sale_row_locking(self):
        """Under concurrent requests, only one checkout succeeds for the last unit."""
        results = []

        def do_checkout(user_email):
            client = APIClient()
            access, _ = get_tokens(client, user_email)
            client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
            response = client.post("/api/v1/sales/checkout/", {
                "items": [{"product": self.product.pk, "quantity": 1, "unit_price": "150.00"}],
                "payment_method": "cash",
            }, format="json")
            results.append(response.status_code)

        t1 = threading.Thread(target=do_checkout, args=("staff1@test.com",))
        t2 = threading.Thread(target=do_checkout, args=("staff2@test.com",))
        t1.start()
        t2.start()
        t1.join()
        t2.join()

        success = results.count(201)
        failure = results.count(400)
        self.assertEqual(success, 1, f"Expected 1 success, got {results}")
        self.assertEqual(failure, 1, f"Expected 1 failure, got {results}")

        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 0)


# ─────────────────────────────────────────────
# 6. Financial / Profit Tests
# ─────────────────────────────────────────────

class ProfitMarginTests(TestCase):

    def setUp(self):
        self.admin = make_user("admin@test.com", "Admin", role=UserRole.ADMIN)

    def test_profit_margin_calculation(self):
        """Product.profit_margin returns correct percentage."""
        product = make_product(
            "PRF-001", "Margin Product",
            purchase_price=100, selling_price=150
        )
        # profit = (150-100)/100 * 100 = 50%
        self.assertEqual(product.profit_margin, 50.0)

    def test_zero_purchase_price_margin(self):
        """Zero purchase price → profit_margin returns 0 (no division by zero)."""
        product = make_product("PRF-002", "Free Product", purchase_price=0, selling_price=100)
        self.assertEqual(product.profit_margin, 0)

    def test_financial_report_endpoint(self):
        """Financial report endpoint returns expected keys."""
        client = APIClient()
        access, _ = get_tokens(client, "admin@test.com")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get("/api/v1/sales/reports/?period=month")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for key in ["total_revenue", "total_orders", "gross_profit", "gross_margin_pct"]:
            self.assertIn(key, response.data)

    def test_sales_staff_cannot_view_financial_reports(self):
        """Sales staff blocked from financial reports."""
        staff = make_user("staff@test.com", "Staff", role=UserRole.SALES_STAFF)
        client = APIClient()
        access, _ = get_tokens(client, "staff@test.com")
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get("/api/v1/sales/reports/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ─────────────────────────────────────────────
# 7. Purchase Order Tests
# ─────────────────────────────────────────────

class PurchaseOrderTests(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.admin = make_user("admin@test.com", "Admin", role=UserRole.ADMIN)
        self.supplier = Supplier.objects.create(company_name="Test Supplier Co.")
        self.product = make_product("PUR-PROD-001", "Purchase Product", stock=10)

    def _auth(self, user):
        access, _ = get_tokens(self.client, user.email)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_purchase_order_stock_increase(self):
        """POST /api/v1/purchases/ → stock increments + purchase + ledger row."""
        self._auth(self.admin)
        response = self.client.post("/api/v1/purchases/", {
            "supplier": self.supplier.pk,
            "items": [
                {"product": self.product.pk, "quantity": 25, "unit_cost": "95.00"},
            ],
            "notes": "Restock order",
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 35)
        # Verify ledger
        movement = StockMovement.objects.filter(
            product=self.product, ref_type="PURCHASE"
        ).last()
        self.assertIsNotNone(movement)
        self.assertEqual(movement.quantity, 25)

    def test_purchase_reference_auto_generated(self):
        """Purchase reference is auto-generated in PUR-YYYYMMDD-NNN format."""
        self._auth(self.admin)
        response = self.client.post("/api/v1/purchases/", {
            "supplier": self.supplier.pk,
            "items": [{"product": self.product.pk, "quantity": 5, "unit_cost": "100.00"}],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ref = response.data["reference"]
        self.assertTrue(ref.startswith("PUR-"), f"Got: {ref}")

    def test_sales_staff_cannot_create_purchase(self):
        """Sales staff cannot create purchase orders."""
        staff = make_user("staff@test.com", "Staff", role=UserRole.SALES_STAFF)
        self._auth(staff)
        response = self.client.post("/api/v1/purchases/", {
            "supplier": self.supplier.pk,
            "items": [{"product": self.product.pk, "quantity": 5, "unit_cost": "100.00"}],
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

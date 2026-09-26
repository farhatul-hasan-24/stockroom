import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/layout/Layout";
import LoginPage from "./pages/Login/LoginPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";
import ProductsPage from "./pages/Products/ProductsPage";
import SuppliersPage from "./pages/Suppliers/SuppliersPage";
import CustomersPage from "./pages/Customers/CustomersPage";
import POSPage from "./pages/POS/POSPage";
import InventoryPage from "./pages/Inventory/InventoryPage";
import SalesPage from "./pages/Sales/SalesPage";
import FinancialReportsPage from "./pages/Sales/FinancialReportsPage";
import UsersPage from "./pages/Users/UsersPage";

function ProtectedRoute({ children, roles }: { children: JSX.Element; roles?: string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="suppliers" element={
          <ProtectedRoute roles={["admin","manager"]}><SuppliersPage /></ProtectedRoute>
        } />
        <Route path="customers" element={
          <ProtectedRoute roles={["admin","manager"]}><CustomersPage /></ProtectedRoute>
        } />
        <Route path="pos" element={<POSPage />} />
        <Route path="inventory" element={
          <ProtectedRoute roles={["admin"]}><InventoryPage /></ProtectedRoute>
        } />
        <Route path="sales" element={
          <ProtectedRoute roles={["admin","manager"]}><SalesPage /></ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute roles={["admin","manager"]}><FinancialReportsPage /></ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={["admin"]}><UsersPage /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Truck, Users, ShoppingCart,
  BarChart3, TrendingUp, LogOut, Bell, ChevronRight,
  Boxes, UserCog,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV: NavItem[] = [
  { to: "/",         label: "Dashboard",    icon: <LayoutDashboard size={18}/> },
  { to: "/products", label: "Products",     icon: <Package size={18}/> },
  { to: "/suppliers",label: "Suppliers",    icon: <Truck size={18}/>,       roles: ["admin","manager"] },
  { to: "/customers",label: "Customers",    icon: <Users size={18}/>,       roles: ["admin","manager"] },
  { to: "/pos",      label: "POS Terminal", icon: <ShoppingCart size={18}/> },
  { to: "/sales",    label: "Sales",        icon: <BarChart3 size={18}/>,   roles: ["admin","manager"] },
  { to: "/reports",  label: "Reports",      icon: <TrendingUp size={18}/>,  roles: ["admin","manager"] },
  { to: "/inventory",label: "Inventory Log",icon: <Boxes size={18}/>,       roles: ["admin"] },
  { to: "/users",    label: "Users",        icon: <UserCog size={18}/>,     roles: ["admin"] },
];

const ROLE_BADGE: Record<string, string> = {
  admin:       "badge-blue",
  manager:     "badge-green",
  sales_staff: "badge-yellow",
};
const ROLE_LABEL: Record<string, string> = {
  admin: "Admin", manager: "Manager", sales_staff: "Sales",
};

export default function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
            <Package size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">StockRoom</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon, roles }) => {
            if (roles && !hasRole(...(roles as any))) return null;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive ? "text-primary-600" : "text-gray-400"}>{icon}</span>
                    <span className="flex-1">{label}</span>
                    {isActive && <ChevronRight size={14} className="text-primary-400" />}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm uppercase">
              {user?.name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <span className={`badge text-[10px] mt-0.5 ${ROLE_BADGE[user?.role ?? ""]}`}>
                {ROLE_LABEL[user?.role ?? ""]}
              </span>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
          <div /> {/* breadcrumb placeholder */}
          <button className="relative p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors">
            <Bell size={18} />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

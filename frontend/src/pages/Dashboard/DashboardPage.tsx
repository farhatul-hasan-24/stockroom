import { Package, AlertTriangle, XCircle, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { dashboardApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { StatCard, PageLoader, PageHeader } from "../../components/ui";
import type { DashboardSummary } from "../../types";

function fmt(n: number) {
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

export default function DashboardPage() {
  const { data, loading } = useFetch<DashboardSummary>(() => dashboardApi.summary());

  if (loading || !data) return <PageLoader />;

  const chartData = data.daily_sales.map(d => ({
    date: format(parseISO(d.date), "dd MMM"),
    revenue: Number(d.total),
    orders: d.count,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" description="Live overview of your store" />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Products"
          value={data.total_products}
          icon={<Package size={20} />}
          color="primary"
          sub="Active SKUs"
        />
        <StatCard
          label="Low Stock Alerts"
          value={data.low_stock_alerts}
          icon={<AlertTriangle size={20} />}
          color="yellow"
          sub="At or below minimum"
        />
        <StatCard
          label="Out of Stock"
          value={data.out_of_stock}
          icon={<XCircle size={20} />}
          color="red"
          sub="Zero inventory"
        />
        <StatCard
          label="Today's Sales"
          value={fmt(data.today_sales_bdt)}
          icon={<TrendingUp size={20} />}
          color="green"
          sub={new Date().toLocaleDateString("en-BD", { weekday: "long", month: "short", day: "numeric" })}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="card p-5 xl:col-span-2">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Revenue — Last 7 Days</h2>
          {chartData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-300 text-sm">No sales data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6270f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6270f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [fmt(v), "Revenue"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6270f1" strokeWidth={2} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Low Stock List */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Low Stock Items</h2>
            <Link to="/products?low_stock=true" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {data.low_stock_products.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">All products are well-stocked ✓</p>
          ) : (
            <div className="space-y-3">
              {data.low_stock_products.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.sku}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${p.current_stock === 0 ? "text-red-600" : "text-yellow-600"}`}>
                      {p.current_stock}
                    </span>
                    <p className="text-xs text-gray-400">/ {p.minimum_stock} min</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

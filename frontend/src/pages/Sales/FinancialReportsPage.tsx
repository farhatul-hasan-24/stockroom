import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { TrendingUp, ShoppingBag, ReceiptText, Percent } from "lucide-react";
import { salesApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { StatCard, PageLoader, PageHeader } from "../../components/ui";
import type { FinancialReport } from "../../types";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week",  label: "Last 7 Days" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

function fmt(n: number) {
  return "৳" + n.toLocaleString("en-BD", { maximumFractionDigits: 0 });
}

export default function FinancialReportsPage() {
  const [period, setPeriod] = useState("month");

  const { data, loading } = useFetch<FinancialReport>(
    () => salesApi.reports(period),
    [period]
  );

  const chartData = data ? [
    { name: "Revenue",     value: data.total_revenue,    color: "#6270f1" },
    { name: "COGS",        value: data.total_cogs,       color: "#f59e0b" },
    { name: "Gross Profit",value: data.gross_profit,     color: "#22c55e" },
    { name: "Discounts",   value: data.total_discount,   color: "#ef4444" },
  ] : [];

  return (
    <div>
      <PageHeader title="Financial Reports" description="Revenue, cost and profit analysis" />

      {/* Period tabs */}
      <div className="flex gap-2 mb-6">
        {PERIODS.map(p => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? "bg-primary-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading || !data ? <PageLoader /> : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Revenue"
              value={fmt(data.total_revenue)}
              icon={<TrendingUp size={20} />}
              color="primary"
              sub={`${data.start_date} — ${data.end_date}`}
            />
            <StatCard
              label="Total Orders"
              value={data.total_orders.toLocaleString()}
              icon={<ShoppingBag size={20} />}
              color="green"
              sub={`Avg ৳${Math.round(data.avg_order_value).toLocaleString()}/order`}
            />
            <StatCard
              label="Gross Profit"
              value={fmt(data.gross_profit)}
              icon={<ReceiptText size={20} />}
              color="green"
              sub={`COGS: ${fmt(data.total_cogs)}`}
            />
            <StatCard
              label="Gross Margin"
              value={`${data.gross_margin_pct.toFixed(1)}%`}
              icon={<Percent size={20} />}
              color={data.gross_margin_pct >= 20 ? "green" : data.gross_margin_pct >= 0 ? "yellow" : "red"}
              sub={`Discount given: ${fmt(data.total_discount)}`}
            />
          </div>

          {/* Bar chart */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-5">Financial Breakdown</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `৳${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [fmt(v)]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail table */}
          <div className="card p-6 mt-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Summary Table</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {[
                  ["Period", `${data.start_date} → ${data.end_date}`],
                  ["Total Revenue", fmt(data.total_revenue)],
                  ["Total Discounts Given", fmt(data.total_discount)],
                  ["Net Revenue", fmt(data.total_revenue - data.total_discount)],
                  ["Cost of Goods Sold (COGS)", fmt(data.total_cogs)],
                  ["Gross Profit", fmt(data.gross_profit)],
                  ["Gross Margin %", `${data.gross_margin_pct.toFixed(2)}%`],
                  ["Total Orders", data.total_orders.toLocaleString()],
                  ["Avg Order Value", fmt(data.avg_order_value)],
                ].map(([label, val]) => (
                  <tr key={label}>
                    <td className="py-3 text-gray-500">{label}</td>
                    <td className="py-3 font-semibold text-gray-900 text-right">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

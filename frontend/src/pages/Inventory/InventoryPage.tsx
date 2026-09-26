import { useState } from "react";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { inventoryApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { Table, PageHeader, SearchBar, Pagination } from "../../components/ui";
import type { StockMovement, PaginatedResponse } from "../../types";

const TYPE_STYLES: Record<string, string> = {
  PURCHASE:   "badge-blue",
  SALE:       "badge-green",
  DAMAGED:    "badge-red",
  ADJUSTMENT: "badge-yellow",
  RETURN:     "badge-gray",
};

function DeltaBadge({ qty }: { qty: number }) {
  const pos = qty > 0;
  const zero = qty === 0;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-sm font-semibold ${zero ? "text-gray-400" : pos ? "text-green-600" : "text-red-600"}`}>
      {zero ? <Minus size={12}/> : pos ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
      {pos ? "+" : ""}{qty}
    </span>
  );
}

export default function InventoryPage() {
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [typeFilter, setType] = useState("");

  const params: Record<string, string> = { page: String(page) };
  if (typeFilter) params.movement_type = typeFilter;

  const { data, loading } = useFetch<PaginatedResponse<StockMovement>>(
    () => inventoryApi.movements(params),
    [page, typeFilter, search]
  );

  const columns = [
    { key: "id", header: "ID", render: (m: StockMovement) =>
      <span className="font-mono text-xs text-gray-400">#{m.id}</span> },
    { key: "product_name", header: "Product", render: (m: StockMovement) =>
      <div>
        <p className="font-medium text-gray-900 text-sm">{m.product_name}</p>
        <p className="text-xs font-mono text-gray-400">{m.product_sku}</p>
      </div> },
    { key: "movement_type", header: "Type", render: (m: StockMovement) =>
      <span className={`badge ${TYPE_STYLES[m.movement_type] ?? "badge-gray"}`}>{m.movement_type}</span> },
    { key: "quantity", header: "Delta", render: (m: StockMovement) => <DeltaBadge qty={m.quantity} /> },
    { key: "prev_stock", header: "Before → After", render: (m: StockMovement) =>
      <span className="text-sm font-mono text-gray-600">
        {m.prev_stock} <span className="text-gray-300 mx-1">→</span> <span className="font-semibold text-gray-900">{m.new_stock}</span>
      </span> },
    { key: "ref_id", header: "Reference", render: (m: StockMovement) =>
      <span className="text-xs font-mono text-gray-500">{m.ref_id || "—"}</span> },
    { key: "created_by_name", header: "Operator", render: (m: StockMovement) =>
      <span className="text-sm text-gray-600">{m.created_by_name ?? "—"}</span> },
    { key: "created_at", header: "Date", render: (m: StockMovement) =>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {new Date(m.created_at).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
      </span> },
  ];

  return (
    <div>
      <PageHeader title="Inventory Audit Log" description="Immutable record of every stock movement" />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-64">
          <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search product…" />
        </div>
        <select
          className="input w-44"
          value={typeFilter}
          onChange={e => { setType(e.target.value); setPage(1); }}
        >
          <option value="">All types</option>
          <option value="PURCHASE">Purchase</option>
          <option value="SALE">Sale</option>
          <option value="DAMAGED">Damaged</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="RETURN">Return</option>
        </select>
      </div>

      <Table
        columns={columns}
        data={data?.results ?? []}
        keyFn={m => m.id}
        loading={loading}
        emptyTitle="No movements found"
      />
      <Pagination count={data?.count ?? 0} page={page} onChange={setPage} />
    </div>
  );
}

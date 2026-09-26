import { useState } from "react";
import { Eye } from "lucide-react";
import { salesApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { Table, Modal, PageHeader, SearchBar, Pagination } from "../../components/ui";
import type { Sale, PaginatedResponse } from "../../types";

export default function SalesPage() {
  const [page, setPage]         = useState(1);
  const [dateFrom, setFrom]     = useState("");
  const [dateTo, setTo]         = useState("");
  const [viewing, setViewing]   = useState<Sale | null>(null);

  const params: Record<string, string> = { page: String(page) };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo)   params.date_to   = dateTo;

  const { data, loading } = useFetch<PaginatedResponse<Sale>>(
    () => salesApi.list(params),
    [page, dateFrom, dateTo]
  );

  const columns = [
    { key: "reference", header: "Invoice", render: (s: Sale) =>
      <span className="font-mono text-xs font-semibold text-primary-700">{s.reference}</span> },
    { key: "customer_name", header: "Customer", render: (s: Sale) =>
      <span className="text-sm">{s.customer_name || <span className="text-gray-400 italic">Walk-in</span>}</span> },
    { key: "grand_total", header: "Total", render: (s: Sale) =>
      <span className="font-bold text-gray-900">৳{Number(s.grand_total).toLocaleString()}</span> },
    { key: "discount", header: "Discount", render: (s: Sale) =>
      <span className="text-sm text-gray-500">{Number(s.discount) > 0 ? `৳${Number(s.discount).toLocaleString()}` : "—"}</span> },
    { key: "payment_method", header: "Payment", render: (s: Sale) =>
      <span className="badge badge-blue capitalize">{s.payment_method.replace("_", " ")}</span> },
    { key: "item_count", header: "Items", render: (s: Sale) =>
      <span className="text-sm text-gray-500">{s.item_count}</span> },
    { key: "created_by_name", header: "By", render: (s: Sale) =>
      <span className="text-xs text-gray-400">{s.created_by_name}</span> },
    { key: "created_at", header: "Date", render: (s: Sale) =>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {new Date(s.created_at).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" })}
      </span> },
    { key: "actions", header: "", render: (s: Sale) => (
      <button className="btn-ghost p-1.5" onClick={() => setViewing(s)}><Eye size={14}/></button>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Sales History" description="Complete record of all transactions" />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 shrink-0">From</label>
          <input type="date" className="input w-40 text-sm" value={dateFrom} onChange={e => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 shrink-0">To</label>
          <input type="date" className="input w-40 text-sm" value={dateTo} onChange={e => { setTo(e.target.value); setPage(1); }} />
        </div>
        {(dateFrom || dateTo) && (
          <button className="btn-ghost text-xs" onClick={() => { setFrom(""); setTo(""); setPage(1); }}>Clear dates</button>
        )}
      </div>

      <Table columns={columns} data={data?.results ?? []} keyFn={s => s.id} loading={loading} emptyTitle="No sales found" />
      <Pagination count={data?.count ?? 0} page={page} onChange={setPage} />

      {/* Sale Detail Modal */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={`Invoice ${viewing?.reference}`} width="max-w-xl">
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-400 text-xs">Customer</p><p className="font-medium">{viewing.customer_name || "Walk-in"}</p></div>
              <div><p className="text-gray-400 text-xs">Payment</p><p className="font-medium capitalize">{viewing.payment_method.replace("_"," ")}</p></div>
              <div><p className="text-gray-400 text-xs">Processed by</p><p className="font-medium">{viewing.created_by_name}</p></div>
              <div><p className="text-gray-400 text-xs">Date</p><p className="font-medium">{new Date(viewing.created_at).toLocaleString()}</p></div>
            </div>
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs text-gray-500 font-semibold">Product</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold">Qty</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold">Unit Price</th>
                    <th className="px-4 py-2 text-right text-xs text-gray-500 font-semibold">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {viewing.items?.map(item => (
                    <tr key={item.id}>
                      <td className="px-4 py-2.5 text-gray-800">{item.product_name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">৳{Number(item.unit_price).toLocaleString()}</td>
                      <td className="px-4 py-2.5 text-right font-medium">৳{Number(item.subtotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1 pt-2 text-sm">
              {Number(viewing.discount) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Discount</span><span>- ৳{Number(viewing.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 border-t border-gray-100 pt-2">
                <span>Grand Total</span>
                <span className="text-primary-700">৳{Number(viewing.grand_total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import toast from "react-hot-toast";
import { productsApi, categoriesApi, suppliersApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import {
  Table, Modal, ConfirmDialog, PageHeader, SearchBar,
  Pagination, FormField, Input, Select, Spinner,
} from "../../components/ui";
import type { Product, Category, Supplier, PaginatedResponse } from "../../types";

const schema = z.object({
  sku:            z.string().min(1, "SKU is required"),
  name:           z.string().min(1, "Name is required"),
  barcode:        z.string().optional(),
  category:       z.string().optional(),
  supplier:       z.string().optional(),
  purchase_price: z.string().min(1, "Required"),
  selling_price:  z.string().min(1, "Required"),
  minimum_stock:  z.string().default("10"),
  unit:           z.string().default("pcs"),
  status:         z.string().default("active"),
});
type FormData = z.infer<typeof schema>;

export default function ProductsPage() {
  const { isAdmin, isManager } = useAuth();
  const canWrite = isAdmin || isManager;

  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [filterStatus, setFilter]   = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Product | null>(null);
  const [delTarget, setDelTarget]   = useState<Product | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showCats, setShowCats]     = useState(false);

  const params: Record<string, string> = { page: String(page) };
  if (search)      params.search = search;
  if (filterStatus) params.status = filterStatus;

  const { data, loading, refetch } = useFetch<PaginatedResponse<Product>>(
    () => productsApi.list(params),
    [search, page, filterStatus]
  );
  const { data: catData, refetch: refetchCats } = useFetch<PaginatedResponse<Category>>(
    () => categoriesApi.list()
  );
  const { data: supData } = useFetch<PaginatedResponse<Supplier>>(() => suppliersApi.list());

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => { reset({}); setEditing(null); setShowForm(true); };
  const openEdit   = (p: Product) => {
    reset({
      sku: p.sku, name: p.name, barcode: p.barcode,
      category: p.category ? String(p.category) : "",
      supplier: p.supplier ? String(p.supplier) : "",
      purchase_price: p.purchase_price,
      selling_price: p.selling_price,
      minimum_stock: String(p.minimum_stock),
      unit: p.unit, status: p.status,
    });
    setEditing(p); setShowForm(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        category: data.category ? Number(data.category) : null,
        supplier: data.supplier ? Number(data.supplier) : null,
        minimum_stock: Number(data.minimum_stock),
      };
      if (editing) {
        await productsApi.update(editing.id, payload);
        toast.success("Product updated");
      } else {
        await productsApi.create(payload);
        toast.success("Product created");
      }
      setShowForm(false); refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.sku?.[0] ?? e?.response?.data?.detail ?? "Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDelLoading(true);
    try {
      await productsApi.delete(delTarget.id);
      toast.success("Product deleted");
      setDelTarget(null); refetch();
    } catch { toast.error("Delete failed"); }
    finally { setDelLoading(false); }
  };

  const columns = [
    { key: "sku", header: "SKU", render: (p: Product) =>
      <span className="font-mono text-xs text-gray-500">{p.sku}</span> },
    { key: "name", header: "Product", render: (p: Product) =>
      <div>
        <p className="font-medium text-gray-900">{p.name}</p>
        <p className="text-xs text-gray-400">{p.category_name}</p>
      </div> },
    { key: "selling_price", header: "Price", render: (p: Product) =>
      <span className="font-semibold">৳{Number(p.selling_price).toLocaleString()}</span> },
    { key: "current_stock", header: "Stock", render: (p: Product) =>
      <span className={`font-semibold ${p.current_stock === 0 ? "text-red-600" : p.is_low_stock ? "text-yellow-600" : "text-green-600"}`}>
        {p.current_stock} {p.unit}
        {p.current_stock === 0 && <span className="ml-1 badge-red badge text-[10px]">Out</span>}
        {p.current_stock > 0 && p.is_low_stock && <span className="ml-1 badge-yellow badge text-[10px]">Low</span>}
      </span> },
    { key: "profit_margin", header: "Margin", render: (p: Product) =>
      <span className="text-xs text-gray-500">{p.profit_margin}%</span> },
    { key: "status", header: "Status", render: (p: Product) =>
      <span className={`badge ${p.status === "active" ? "badge-green" : "badge-gray"}`}>{p.status}</span> },
    { key: "actions", header: "", render: (p: Product) => canWrite ? (
      <div className="flex items-center gap-1 justify-end">
        <button className="btn-ghost p-1.5" onClick={() => openEdit(p)}><Pencil size={14}/></button>
        {isAdmin && <button className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDelTarget(p)}><Trash2 size={14}/></button>}
      </div>
    ) : null },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog"
        action={canWrite ? (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setShowCats(true)}><Tag size={15}/> Categories</button>
            <button className="btn-primary" onClick={openCreate}><Plus size={15}/> Add Product</button>
          </div>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="w-72"><SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search by name, SKU, barcode…" /></div>
        <select className="input w-40" value={filterStatus} onChange={e => { setFilter(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="discontinued">Discontinued</option>
        </select>
      </div>

      <Table columns={columns} data={data?.results ?? []} keyFn={p => p.id} loading={loading} emptyTitle="No products found" />
      <Pagination count={data?.count ?? 0} page={page} onChange={setPage} />

      {/* Product Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Product" : "New Product"} width="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          <FormField label="SKU" error={errors.sku?.message} required>
            <Input {...register("sku")} placeholder="e.g. PROD-001" error={errors.sku?.message} />
          </FormField>
          <FormField label="Barcode" error={errors.barcode?.message}>
            <Input {...register("barcode")} placeholder="Optional barcode" />
          </FormField>
          <FormField label="Product Name" error={errors.name?.message} required className="col-span-2">
            <Input {...register("name")} placeholder="Product name" error={errors.name?.message} />
          </FormField>
          <FormField label="Category">
            <Select {...register("category")}>
              <option value="">— No category —</option>
              {catData?.results.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormField>
          <FormField label="Supplier">
            <Select {...register("supplier")}>
              <option value="">— No supplier —</option>
              {supData?.results.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
            </Select>
          </FormField>
          <FormField label="Purchase Price (৳)" error={errors.purchase_price?.message} required>
            <Input {...register("purchase_price")} type="number" step="0.01" placeholder="0.00" error={errors.purchase_price?.message} />
          </FormField>
          <FormField label="Selling Price (৳)" error={errors.selling_price?.message} required>
            <Input {...register("selling_price")} type="number" step="0.01" placeholder="0.00" error={errors.selling_price?.message} />
          </FormField>
          <FormField label="Minimum Stock">
            <Input {...register("minimum_stock")} type="number" placeholder="10" />
          </FormField>
          <FormField label="Unit">
            <Input {...register("unit")} placeholder="pcs / kg / box…" />
          </FormField>
          <FormField label="Status">
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </Select>
          </FormField>
          <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : editing ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Categories Modal */}
      <CategoriesModal open={showCats} onClose={() => setShowCats(false)} data={catData?.results ?? []} refetch={refetchCats} isAdmin={isAdmin} />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!delTarget}
        title="Delete Product"
        message={`Delete "${delTarget?.name}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
        loading={delLoading}
      />
    </div>
  );
}

// ── Inline Categories Modal ───────────────────────────────
function CategoriesModal({ open, onClose, data, refetch, isAdmin }: {
  open: boolean; onClose: () => void;
  data: Category[]; refetch: () => void; isAdmin: boolean;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [delId, setDelId]   = useState<number | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await categoriesApi.create({ name, description: desc });
      toast.success("Category created"); setName(""); setDesc(""); refetch();
    } catch { toast.error("Failed to create category"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDelId(id);
    try {
      await categoriesApi.delete(id);
      toast.success("Category deleted"); refetch();
    } catch { toast.error("Cannot delete — products may reference it"); }
    finally { setDelId(null); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Manage Categories">
      {isAdmin && (
        <div className="flex gap-2 mb-5">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Category name" className="flex-1" />
          <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)" className="flex-1" />
          <button className="btn-primary shrink-0" onClick={handleCreate} disabled={saving}>
            {saving ? <Spinner size={14} /> : <Plus size={14} />}
          </button>
        </div>
      )}
      <div className="space-y-2">
        {data.map(cat => (
          <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div>
              <p className="text-sm font-medium text-gray-800">{cat.name}</p>
              <p className="text-xs text-gray-400">{cat.product_count} products</p>
            </div>
            {isAdmin && (
              <button
                className="btn-ghost p-1.5 text-red-400 hover:text-red-600"
                onClick={() => handleDelete(cat.id)}
                disabled={delId === cat.id}
              >
                {delId === cat.id ? <Spinner size={13} /> : <Trash2 size={13} />}
              </button>
            )}
          </div>
        ))}
        {data.length === 0 && <p className="text-sm text-center text-gray-400 py-6">No categories yet</p>}
      </div>
    </Modal>
  );
}

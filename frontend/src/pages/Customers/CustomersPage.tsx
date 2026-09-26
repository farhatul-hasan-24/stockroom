import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { customersApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import {
  Table, Modal, ConfirmDialog, PageHeader, SearchBar,
  Pagination, FormField, Input, Spinner,
} from "../../components/ui";
import type { Customer, PaginatedResponse } from "../../types";

const schema = z.object({
  name:    z.string().min(1, "Name is required"),
  phone:   z.string().optional(),
  email:   z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

export default function CustomersPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Customer | null>(null);
  const [delTarget, setDelTarget]   = useState<Customer | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [saving, setSaving]         = useState(false);

  const params: Record<string, string> = { page: String(page) };
  if (search) params.search = search;

  const { data, loading, refetch } = useFetch<PaginatedResponse<Customer>>(
    () => customersApi.list(params),
    [search, page]
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => { reset({}); setEditing(null); setShowForm(true); };
  const openEdit   = (c: Customer) => {
    reset({ name: c.name, phone: c.phone, email: c.email, address: c.address });
    setEditing(c); setShowForm(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      if (editing) { await customersApi.update(editing.id, data); toast.success("Customer updated"); }
      else { await customersApi.create(data); toast.success("Customer created"); }
      setShowForm(false); refetch();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDelLoading(true);
    try { await customersApi.delete(delTarget.id); toast.success("Customer deleted"); setDelTarget(null); refetch(); }
    catch { toast.error("Delete failed"); }
    finally { setDelLoading(false); }
  };

  const columns = [
    { key: "name", header: "Customer", render: (c: Customer) =>
      <div><p className="font-medium text-gray-900">{c.name}</p>
      <p className="text-xs text-gray-400">{c.phone || c.email || "—"}</p></div> },
    { key: "email", header: "Email", render: (c: Customer) => <span className="text-sm">{c.email || "—"}</span> },
    { key: "address", header: "Address", render: (c: Customer) =>
      <span className="text-sm text-gray-500 truncate max-w-xs block">{c.address || "—"}</span> },
    { key: "created_at", header: "Since", render: (c: Customer) =>
      <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span> },
    { key: "actions", header: "", render: (c: Customer) => (
      <div className="flex items-center gap-1 justify-end">
        <button className="btn-ghost p-1.5" onClick={() => openEdit(c)}><Pencil size={14}/></button>
        {isAdmin && <button className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDelTarget(c)}><Trash2 size={14}/></button>}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title="Customers" description="Manage your customer directory"
        action={<button className="btn-primary" onClick={openCreate}><Plus size={15}/> Add Customer</button>}
      />
      <div className="mb-5 w-72">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search customers…" />
      </div>

      <Table columns={columns} data={data?.results ?? []} keyFn={c => c.id} loading={loading} emptyTitle="No customers found" />
      <Pagination count={data?.count ?? 0} page={page} onChange={setPage} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Customer" : "New Customer"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Full Name" error={errors.name?.message} required>
            <Input {...register("name")} placeholder="Customer name" error={errors.name?.message} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <Input {...register("phone")} placeholder="+880…" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="email@example.com" error={errors.email?.message} />
            </FormField>
          </div>
          <FormField label="Address">
            <textarea {...register("address")} className="input min-h-[72px] resize-none" placeholder="Full address" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : editing ? "Save Changes" : "Create Customer"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog open={!!delTarget} title="Delete Customer" message={`Delete "${delTarget?.name}"?`}
        onConfirm={handleDelete} onCancel={() => setDelTarget(null)} loading={delLoading} />
    </div>
  );
}

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { suppliersApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import {
  Table, Modal, ConfirmDialog, PageHeader, SearchBar,
  Pagination, FormField, Input, Select, Spinner,
} from "../../components/ui";
import type { Supplier, PaginatedResponse, SupplierStatus } from "../../types";

const schema = z.object({
  company_name:   z.string().min(1, "Company name is required"),
  contact_person: z.string().optional(),
  phone:          z.string().optional(),
  email:          z.string().email("Invalid email").optional().or(z.literal("")),
  address:        z.string().optional(),
  status:         z.enum(["active", "inactive"]).default("active"),
});
type FormData = z.infer<typeof schema>;

export default function SuppliersPage() {
  const { isAdmin } = useAuth();
  const [search, setSearch]         = useState("");
  const [page, setPage]             = useState(1);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Supplier | null>(null);
  const [delTarget, setDelTarget]   = useState<Supplier | null>(null);
  const [delLoading, setDelLoading] = useState(false);
  const [saving, setSaving]         = useState(false);

  const params: Record<string, string> = { page: String(page) };
  if (search) params.search = search;

  const { data, loading, refetch } = useFetch<PaginatedResponse<Supplier>>(
    () => suppliersApi.list(params),
    [search, page]
  );

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const openCreate = () => { reset({}); setEditing(null); setShowForm(true); };
  const openEdit   = (s: Supplier) => {
    reset({
      company_name: s.company_name,
      contact_person: s.contact_person,
      phone: s.phone,
      email: s.email,
      address: s.address,
      status: s.status,
    });
    setEditing(s); setShowForm(true);
  };

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const payload = { ...data, status: data.status as SupplierStatus };
      if (editing) {
        await suppliersApi.update(editing.id, payload);
        toast.success("Supplier updated");
      } else {
        await suppliersApi.create(payload);
        toast.success("Supplier created");
      }
      setShowForm(false); refetch();
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDelLoading(true);
    try {
      await suppliersApi.delete(delTarget.id);
      toast.success("Supplier deleted");
      setDelTarget(null); refetch();
    } catch { toast.error("Delete failed — supplier may have linked orders"); }
    finally { setDelLoading(false); }
  };

  const columns = [
    { key: "company_name", header: "Company", render: (s: Supplier) =>
      <div>
        <p className="font-medium text-gray-900">{s.company_name}</p>
        <p className="text-xs text-gray-400">{s.contact_person}</p>
      </div> },
    { key: "phone", header: "Phone", render: (s: Supplier) =>
      <span className="text-sm">{s.phone || "—"}</span> },
    { key: "email", header: "Email", render: (s: Supplier) =>
      <span className="text-sm">{s.email || "—"}</span> },
    { key: "status", header: "Status", render: (s: Supplier) =>
      <span className={`badge ${s.status === "active" ? "badge-green" : "badge-gray"}`}>{s.status}</span> },
    { key: "actions", header: "", render: (s: Supplier) => (
      <div className="flex items-center gap-1 justify-end">
        <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}><Pencil size={14}/></button>
        {isAdmin && (
          <button className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDelTarget(s)}>
            <Trash2 size={14}/>
          </button>
        )}
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage your supplier directory"
        action={<button className="btn-primary" onClick={openCreate}><Plus size={15}/> Add Supplier</button>}
      />
      <div className="mb-5 w-72">
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search suppliers…" />
      </div>

      <Table columns={columns} data={data?.results ?? []} keyFn={s => s.id} loading={loading} emptyTitle="No suppliers found" />
      <Pagination count={data?.count ?? 0} page={page} onChange={setPage} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? "Edit Supplier" : "New Supplier"}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Company Name" error={errors.company_name?.message} required>
            <Input {...register("company_name")} placeholder="ABC Corp" error={errors.company_name?.message} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Contact Person">
              <Input {...register("contact_person")} placeholder="Full name" />
            </FormField>
            <FormField label="Phone">
              <Input {...register("phone")} placeholder="+880…" />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <Input {...register("email")} type="email" placeholder="contact@company.com" error={errors.email?.message} />
            </FormField>
            <FormField label="Status">
              <Select {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </FormField>
          </div>
          <FormField label="Address">
            <textarea {...register("address")} className="input min-h-[72px] resize-none" placeholder="Full address" />
          </FormField>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : editing ? "Save Changes" : "Create Supplier"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        title="Delete Supplier"
        message={`Delete "${delTarget?.company_name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDelTarget(null)}
        loading={delLoading}
      />
    </div>
  );
}

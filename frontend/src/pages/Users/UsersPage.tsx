import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, UserCheck, UserX } from "lucide-react";
import toast from "react-hot-toast";
import { usersApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { useAuth } from "../../context/AuthContext";
import {
  Table, Modal, ConfirmDialog, PageHeader,
  FormField, Input, Select, Spinner,
} from "../../components/ui";
import type { AuthUser } from "../../types";

const schema = z.object({
  name:             z.string().min(1, "Name is required"),
  email:            z.string().email("Valid email required"),
  role:             z.enum(["admin", "manager", "sales_staff"]),
  password:         z.string().min(8, "Minimum 8 characters"),
  password_confirm: z.string().min(1, "Required"),
}).refine(d => d.password === d.password_confirm, {
  message: "Passwords do not match", path: ["password_confirm"],
});
type FormData = z.infer<typeof schema>;

const ROLE_LABELS: Record<string, string> = { admin: "Admin", manager: "Manager", sales_staff: "Sales Staff" };
const ROLE_BADGE:  Record<string, string> = { admin: "badge-blue", manager: "badge-green", sales_staff: "badge-yellow" };

export default function UsersPage() {
  const { user: me }              = useAuth();
  const [showForm, setShowForm]   = useState(false);
  const [toggleTarget, setToggle] = useState<AuthUser | null>(null);
  const [saving, setSaving]       = useState(false);
  const [toggling, setToggling]   = useState(false);

  const { data, loading, refetch } = useFetch<{ results: AuthUser[] }>(() => usersApi.list());

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "sales_staff" },
  });

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      await usersApi.create(data);
      toast.success("User created successfully");
      setShowForm(false); reset(); refetch();
    } catch (e: any) {
      const emailErr = e?.response?.data?.email?.[0];
      toast.error(emailErr ?? "Failed to create user");
    } finally { setSaving(false); }
  };

  const handleToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await usersApi.toggleActive(toggleTarget.id);
      toast.success(`User ${toggleTarget.is_active ? "deactivated" : "activated"}`);
      setToggle(null); refetch();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Action failed");
    } finally { setToggling(false); }
  };

  const users: AuthUser[] = (data as any)?.results ?? (Array.isArray(data) ? data : []);

  const columns = [
    { key: "name", header: "User", render: (u: AuthUser) =>
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm uppercase shrink-0">
          {u.name[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900 text-sm">{u.name} {u.id === me?.id && <span className="text-xs text-gray-400">(you)</span>}</p>
          <p className="text-xs text-gray-400">{u.email}</p>
        </div>
      </div> },
    { key: "role", header: "Role", render: (u: AuthUser) =>
      <span className={`badge ${ROLE_BADGE[u.role]}`}>{ROLE_LABELS[u.role]}</span> },
    { key: "is_active", header: "Status", render: (u: AuthUser) =>
      <span className={`badge ${u.is_active ? "badge-green" : "badge-red"}`}>
        {u.is_active ? "Active" : "Inactive"}
      </span> },
    { key: "created_at", header: "Created", render: (u: AuthUser) =>
      <span className="text-xs text-gray-400">{new Date((u as any).created_at).toLocaleDateString()}</span> },
    { key: "actions", header: "", render: (u: AuthUser) => u.id !== me?.id ? (
      <button
        className={`btn-ghost p-1.5 ${u.is_active ? "text-red-400 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-700 hover:bg-green-50"}`}
        onClick={() => setToggle(u)}
        title={u.is_active ? "Deactivate" : "Activate"}
      >
        {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
      </button>
    ) : null },
  ];

  return (
    <div>
      <PageHeader
        title="Users & Access"
        description="Manage system users and their roles"
        action={
          <button className="btn-primary" onClick={() => { reset(); setShowForm(true); }}>
            <Plus size={15} /> Add User
          </button>
        }
      />

      <Table columns={columns} data={users} keyFn={u => u.id} loading={loading} emptyTitle="No users found" />

      {/* Create User Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Create New User">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Full Name" error={errors.name?.message} required>
            <Input {...register("name")} placeholder="Full name" error={errors.name?.message} />
          </FormField>
          <FormField label="Email Address" error={errors.email?.message} required>
            <Input {...register("email")} type="email" placeholder="user@company.com" error={errors.email?.message} />
          </FormField>
          <FormField label="Role" required>
            <Select {...register("role")}>
              <option value="sales_staff">Sales Staff</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </Select>
          </FormField>
          <FormField label="Password" error={errors.password?.message} required>
            <Input {...register("password")} type="password" placeholder="Min. 8 characters" error={errors.password?.message} />
          </FormField>
          <FormField label="Confirm Password" error={errors.password_confirm?.message} required>
            <Input {...register("password_confirm")} type="password" placeholder="Repeat password" error={errors.password_confirm?.message} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <Spinner size={14} /> : "Create User"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Toggle Active Confirm */}
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? "Deactivate User" : "Activate User"}
        message={toggleTarget?.is_active
          ? `Deactivate "${toggleTarget?.name}"? They will no longer be able to log in.`
          : `Reactivate "${toggleTarget?.name}"? They will regain access.`
        }
        danger={toggleTarget?.is_active ?? false}
        onConfirm={handleToggle}
        onCancel={() => setToggle(null)}
        loading={toggling}
      />
    </div>
  );
}

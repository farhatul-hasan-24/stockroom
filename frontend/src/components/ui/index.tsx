// ─── Shared UI Components ────────────────────────────────────────────────────
import React, { useEffect } from "react";
import { X, AlertTriangle, Loader2, SearchX, ChevronLeft, ChevronRight } from "lucide-react";

// ── Modal ────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}
export function Modal({ open, onClose, title, children, width = "max-w-lg" }: ModalProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

// ── ConfirmDialog ────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  loading?: boolean;
}
export function ConfirmDialog({ open, title, message, onConfirm, onCancel, danger = true, loading }: ConfirmProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? "bg-red-100" : "bg-yellow-100"}`}>
          <AlertTriangle size={22} className={danger ? "text-red-600" : "text-yellow-600"} />
        </div>
        <h3 className="text-base font-semibold text-center text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-center text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className={`flex-1 btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Spinner size={14} /> : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Spinner ──────────────────────────────────────────────
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}

// ── PageLoader ───────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={28} className="text-primary-500" />
    </div>
  );
}

// ── EmptyState ───────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-gray-300 mb-4">{icon ?? <SearchX size={40} />}</div>
      <p className="font-medium text-gray-600 mb-1">{title}</p>
      {description && <p className="text-sm text-gray-400 mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── Table ────────────────────────────────────────────────
interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}
interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyFn: (row: T) => string | number;
  loading?: boolean;
  emptyTitle?: string;
}
export function Table<T>({ columns, data, keyFn, loading, emptyTitle = "No records found" }: TableProps<T>) {
  if (loading) return <PageLoader />;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-100">
            {columns.map(col => (
              <th key={col.key} className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide ${col.className ?? ""}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>
                <EmptyState title={emptyTitle} />
              </td>
            </tr>
          ) : (
            data.map(row => (
              <tr key={keyFn(row)} className="table-row-hover bg-white">
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className ?? ""}`}>
                    {col.render ? col.render(row) : (row as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Pagination ───────────────────────────────────────────
export function Pagination({ count, page, pageSize = 20, onChange }: {
  count: number; page: number; pageSize?: number; onChange: (p: number) => void;
}) {
  const total = Math.ceil(count / pageSize);
  if (total <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 text-sm text-gray-500">
      <span>Showing {Math.min((page - 1) * pageSize + 1, count)}–{Math.min(page * pageSize, count)} of {count}</span>
      <div className="flex items-center gap-1">
        <button className="btn-ghost p-1.5" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        {Array.from({ length: Math.min(total, 7) }, (_, i) => {
          const p = total <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
          if (p < 1 || p > total) return null;
          return (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${p === page ? "bg-primary-600 text-white" : "hover:bg-gray-100 text-gray-600"}`}
            >
              {p}
            </button>
          );
        })}
        <button className="btn-ghost p-1.5" disabled={page === total} onClick={() => onChange(page + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────
export function StatCard({ label, value, icon, color = "primary", sub }: {
  label: string; value: string | number; icon: React.ReactNode;
  color?: "primary" | "green" | "yellow" | "red"; sub?: React.ReactNode;
}) {
  const colors = {
    primary: "bg-primary-50 text-primary-600",
    green:   "bg-green-50 text-green-600",
    yellow:  "bg-yellow-50 text-yellow-600",
    red:     "bg-red-50 text-red-600",
  };
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
      </div>
    </div>
  );
}

// ── FormField ────────────────────────────────────────────
export function FormField({ label, error, required, children }: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── SearchBar ────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = "Search…" }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pl-9"
      />
    </div>
  );
}

// ── PageHeader ───────────────────────────────────────────
export function PageHeader({ title, description, action }: {
  title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ error, className = "", children, ...props }, ref) => (
    <select ref={ref} className={`input ${error ? "input-error" : ""} ${className}`} {...props}>
      {children}
    </select>
  )
);
Select.displayName = "Select";

// ── Input ────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ error, className = "", ...props }, ref) => (
    <input ref={ref} className={`input ${error ? "input-error" : ""} ${className}`} {...props} />
  )
);
Input.displayName = "Input";

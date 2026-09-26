import { useState, useRef, useCallback } from "react";
import { Search, Scan, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, X, Check } from "lucide-react";
import toast from "react-hot-toast";
import { productsApi, customersApi, salesApi } from "../../api/services";
import { useFetch } from "../../hooks/useFetch";
import { Spinner, PageHeader } from "../../components/ui";
import type { Product, Customer, CartItem, PaginatedResponse, Sale } from "../../types";

const PAYMENT_ICONS = {
  cash: <Banknote size={16} />,
  card: <CreditCard size={16} />,
  mobile_banking: <Smartphone size={16} />,
};

export default function POSPage() {
  const [search, setSearch]           = useState("");
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [discount, setDiscount]       = useState("0");
  const [payMethod, setPayMethod]     = useState<"cash" | "card" | "mobile_banking">("cash");
  const [selectedCustomer, setCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustSearch] = useState("");
  const [checking, setChecking]       = useState(false);
  const [receipt, setReceipt]         = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: productData, loading: prodLoading } = useFetch<PaginatedResponse<Product>>(
    () => productsApi.list({ search, status: "active" }),
    [search]
  );
  const { data: custData } = useFetch<PaginatedResponse<Customer>>(
    () => customersApi.list({ search: customerSearch }),
    [customerSearch]
  );

  const addToCart = useCallback((product: Product) => {
    if (product.current_stock === 0) { toast.error(`${product.name} is out of stock`); return; }
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.current_stock) {
          toast.error(`Only ${product.current_stock} ${product.unit} available`);
          return prev;
        }
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1, unit_price: Number(product.selling_price) }];
    });
  }, []);

  const updateQty = (productId: number, delta: number) => {
    setCart(prev => prev
      .map(i => {
        if (i.product.id !== productId) return i;
        const newQty = i.quantity + delta;
        if (newQty > i.product.current_stock) {
          toast.error(`Max stock: ${i.product.current_stock}`);
          return i;
        }
        return { ...i, quantity: newQty };
      })
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) =>
    setCart(prev => prev.filter(i => i.product.id !== productId));

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const discountAmt = Math.min(Number(discount) || 0, subtotal);
  const grandTotal  = subtotal - discountAmt;

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    setChecking(true);
    try {
      const payload = {
        customer: selectedCustomer?.id ?? null,
        items: cart.map(i => ({
          product: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price.toFixed(2),
        })),
        discount: discountAmt.toFixed(2),
        payment_method: payMethod,
      };
      const { data } = await salesApi.checkout(payload);
      setReceipt(data);
      setCart([]);
      setDiscount("0");
      setCustomer(null);
      setCustSearch("");
      toast.success(`Sale ${data.reference} completed!`);
    } catch (e: any) {
      const detail = e?.response?.data?.detail ?? "Checkout failed";
      const items  = e?.response?.data?.items;
      if (items?.length) {
        items.forEach((it: any) => toast.error(`${it.product}: only ${it.available} available`));
      } else { toast.error(detail); }
    } finally { setChecking(false); }
  };

  // ── Receipt Modal ─────────────────────────────────────────
  if (receipt) {
    return (
      <div className="max-w-md mx-auto">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Sale Complete!</h2>
          <p className="text-gray-500 text-sm mb-6">{receipt.reference}</p>
          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
            {receipt.items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.product_name} × {item.quantity}</span>
                <span className="font-medium">৳{Number(item.subtotal).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-3 space-y-1">
              {Number(receipt.discount) > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Discount</span><span>- ৳{Number(receipt.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary-700">৳{Number(receipt.grand_total).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-4">Payment: {receipt.payment_method.replace("_", " ")}</p>
          <button className="btn-primary w-full justify-center" onClick={() => { setReceipt(null); searchRef.current?.focus(); }}>
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="POS Terminal" description="Process sales and manage checkout" />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 h-[calc(100vh-10rem)]">

        {/* ── Product Grid (left) ── */}
        <div className="xl:col-span-3 flex flex-col gap-4 min-h-0">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input pl-9 pr-10"
              placeholder="Search or scan barcode…"
              autoFocus
            />
            <Scan size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300" />
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto">
            {prodLoading ? (
              <div className="flex justify-center py-16"><Spinner size={24} className="text-primary-500" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {productData?.results.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.current_stock === 0}
                    className={`card p-3 text-left transition-all hover:shadow-md hover:border-primary-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                      cart.some(i => i.product.id === p.id) ? "border-primary-300 bg-primary-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-mono text-gray-400">{p.sku}</span>
                      {p.current_stock === 0
                        ? <span className="badge-red badge text-[10px]">Out</span>
                        : p.is_low_stock
                        ? <span className="badge-yellow badge text-[10px]">{p.current_stock}</span>
                        : <span className="text-xs text-gray-400">{p.current_stock}</span>
                      }
                    </div>
                    <p className="text-sm font-semibold text-gray-800 leading-tight mb-1 line-clamp-2">{p.name}</p>
                    <p className="text-primary-700 font-bold text-sm">৳{Number(p.selling_price).toLocaleString()}</p>
                  </button>
                ))}
                {productData?.results.length === 0 && (
                  <div className="col-span-3 py-16 text-center text-gray-400 text-sm">No products match "{search}"</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Cart (right) ── */}
        <div className="xl:col-span-2 flex flex-col card overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <ShoppingCart size={16} className="text-gray-400" />
            <span className="font-semibold text-gray-800 text-sm">Cart</span>
            {cart.length > 0 && (
              <button className="ml-auto text-xs text-red-400 hover:text-red-600" onClick={() => setCart([])}>Clear all</button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-300">
                <ShoppingCart size={32} />
                <p className="text-sm mt-2">Cart is empty</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                  <p className="text-xs text-primary-700 font-semibold">৳{(item.unit_price * item.quantity).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs" onClick={() => updateQty(item.product.id, -1)}>
                    <Minus size={11} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 text-xs" onClick={() => updateQty(item.product.id, 1)}>
                    <Plus size={11} />
                  </button>
                  <button className="w-6 h-6 rounded-md flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 ml-1" onClick={() => removeFromCart(item.product.id)}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals + checkout */}
          <div className="border-t border-gray-100 p-4 space-y-3">
            {/* Customer selector */}
            <div className="relative">
              <input
                value={selectedCustomer ? selectedCustomer.name : customerSearch}
                onChange={e => { setCustSearch(e.target.value); if (selectedCustomer) setCustomer(null); }}
                className="input text-xs pr-8"
                placeholder="Customer (optional — walk-in)"
              />
              {selectedCustomer && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => { setCustomer(null); setCustSearch(""); }}>
                  <X size={13} />
                </button>
              )}
              {customerSearch && !selectedCustomer && custData?.results.length ? (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-36 overflow-y-auto">
                  {custData.results.map(c => (
                    <button key={c.id} className="w-full text-left px-3 py-2 text-xs hover:bg-primary-50 hover:text-primary-700"
                      onClick={() => { setCustomer(c); setCustSearch(""); }}>
                      {c.name} {c.phone && <span className="text-gray-400">· {c.phone}</span>}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Discount */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">Discount (৳)</label>
              <input
                type="number" min="0" value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="input text-xs flex-1"
              />
            </div>

            {/* Payment method */}
            <div className="flex gap-2">
              {(["cash","card","mobile_banking"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPayMethod(m)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                    payMethod === m ? "border-primary-400 bg-primary-50 text-primary-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {PAYMENT_ICONS[m]}
                  <span>{m === "mobile_banking" ? "Mobile" : m.charAt(0).toUpperCase() + m.slice(1)}</span>
                </button>
              ))}
            </div>

            {/* Summary */}
            <div className="space-y-1 py-2 border-t border-gray-100">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-xs text-red-500">
                  <span>Discount</span><span>- ৳{discountAmt.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-gray-900 pt-1">
                <span>Total</span>
                <span className="text-primary-700">৳{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checking}
              className="btn-primary w-full justify-center py-3 text-sm font-semibold"
            >
              {checking ? <Spinner size={16} /> : `Checkout · ৳${grandTotal.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

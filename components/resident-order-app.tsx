"use client";

import { ClipboardList, Minus, Plus, RefreshCw, ShieldCheck, ShoppingBag } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { todayIsoDate, formatMoney } from "@/lib/date";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { CartLine, DailyMenuItem } from "@/lib/types";

export function ResidentOrderApp() {
  const [menu, setMenu] = useState<DailyMenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [employeeCode, setEmployeeCode] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cartLines: CartLine[] = useMemo(
    () =>
      menu
        .map((item) => ({ item, quantity: cart[item.id] ?? 0 }))
        .filter((line) => line.quantity > 0),
    [cart, menu],
  );

  const total = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const totalQuantity = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  async function loadMenu() {
    setLoading(true);
    setError("");

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setError("Supabase is not configured. Add your project URL and anon key to .env.local.");
      return;
    }

    const { data, error: menuError } = await supabase
      .from("daily_menu_items")
      .select("*")
      .eq("menu_date", todayIsoDate())
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (menuError) {
      setError(menuError.message);
    } else {
      setMenu(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadMenu();
  }, []);

  function updateQuantity(item: DailyMenuItem, change: number) {
    setCart((current) => {
      const nextValue = Math.max(0, (current[item.id] ?? 0) + change);
      const cappedValue =
        item.available_quantity === null ? nextValue : Math.min(nextValue, item.available_quantity);
      return { ...current, [item.id]: cappedValue };
    });
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }

    if (!employeeCode.trim() || !employeeName.trim()) {
      setError("Enter employee code and name before placing the order.");
      return;
    }

    if (cartLines.length === 0) {
      setError("Choose at least one item.");
      return;
    }

    setSubmitting(true);

    const orderId = crypto.randomUUID();
    const { error: orderError } = await supabase
      .from("orders")
      .insert({
        id: orderId,
        employee_code: employeeCode.trim(),
        employee_name: employeeName.trim(),
        order_date: todayIsoDate(),
        status: "pending",
        payment_status: "unpaid",
        total_amount: total,
      });

    if (orderError) {
      setError(orderError.message);
      setSubmitting(false);
      return;
    }

    const orderItems = cartLines.map((line) => ({
      order_id: orderId,
      menu_item_id: line.item.id,
      item_name: line.item.name,
      unit_price: line.item.price,
      quantity: line.quantity,
      line_total: line.item.price * line.quantity,
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

    if (itemsError) {
      setError(itemsError.message);
    } else {
      setSuccess("Order sent for approval. Collect from the guest house after approval.");
      setCart({});
      setEmployeeCode("");
      setEmployeeName("");
    }

    setSubmitting(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Colony guest house</span>
          <h1>Food order</h1>
        </div>
        <nav className="nav-actions" aria-label="Main navigation">
          <a className="button secondary" href="/admin">
            <ShieldCheck size={18} aria-hidden="true" />
            Admin
          </a>
        </nav>
      </header>

      <form className="grid two-column" onSubmit={submitOrder}>
        <section className="grid" aria-labelledby="menu-heading">
          <div className="panel grid">
            <div className="order-heading">
              <div>
                <p className="eyebrow">Today</p>
                <h2 id="menu-heading">Available menu</h2>
              </div>
              <button className="icon-button" type="button" onClick={loadMenu} aria-label="Refresh menu">
                <RefreshCw size={18} aria-hidden="true" />
              </button>
            </div>

            {error ? <div className="error">{error}</div> : null}
            {success ? <div className="success">{success}</div> : null}

            {loading ? (
              <div className="grid" aria-label="Loading menu">
                <div className="skeleton" />
                <div className="skeleton" />
                <div className="skeleton" />
              </div>
            ) : menu.length === 0 ? (
              <div className="notice">
                No menu is available for today. Please check again after the guest house updates it.
              </div>
            ) : (
              <div className="menu-list">
                {menu.map((item) => {
                  const quantity = cart[item.id] ?? 0;
                  return (
                    <article className="card menu-item" key={item.id}>
                      <div className="item-meta">
                        <h3>{item.name}</h3>
                        {item.description ? <p className="muted">{item.description}</p> : null}
                        <p className="price">{formatMoney(item.price)}</p>
                        {item.available_quantity !== null ? (
                          <p className="muted">{item.available_quantity} available</p>
                        ) : null}
                      </div>
                      <div className="quantity-control" aria-label={`Quantity for ${item.name}`}>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => updateQuantity(item, -1)}
                          disabled={quantity === 0}
                          aria-label={`Remove one ${item.name}`}
                        >
                          <Minus size={18} aria-hidden="true" />
                        </button>
                        <span>{quantity}</span>
                        <button
                          className="icon-button"
                          type="button"
                          onClick={() => updateQuantity(item, 1)}
                          disabled={item.available_quantity !== null && quantity >= item.available_quantity}
                          aria-label={`Add one ${item.name}`}
                        >
                          <Plus size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="panel form-grid" aria-labelledby="details-heading">
          <div>
            <p className="eyebrow">Your details</p>
            <h2 id="details-heading">Place order</h2>
          </div>
          <div className="field">
            <label htmlFor="employeeCode">Employee code</label>
            <input
              id="employeeCode"
              name="employeeCode"
              value={employeeCode}
              onChange={(event) => setEmployeeCode(event.target.value)}
              autoComplete="off"
              placeholder="EMP001"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="employeeName">Name</label>
            <input
              id="employeeName"
              name="employeeName"
              value={employeeName}
              onChange={(event) => setEmployeeName(event.target.value)}
              autoComplete="name"
              placeholder="Your name"
              required
            />
          </div>
          <div className="notice">
            <ClipboardList size={18} aria-hidden="true" /> Orders go to the guest house owner for approval.
          </div>
          <button className="button primary" type="submit" disabled={submitting || totalQuantity === 0}>
            <ShoppingBag size={18} aria-hidden="true" />
            {submitting ? "Sending..." : "Send order"}
          </button>
        </aside>
      </form>

      <div className="sticky-cart" aria-live="polite">
        <div className="sticky-cart-inner">
          <div>
            <strong>{totalQuantity} item(s)</strong>
            <p className="muted">{formatMoney(total)}</p>
          </div>
          <button
            className="button primary"
            type="button"
            disabled={submitting || totalQuantity === 0}
            onClick={() => {
              const form = document.querySelector("form");
              form?.requestSubmit();
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </main>
  );
}

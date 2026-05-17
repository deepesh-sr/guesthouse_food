"use client";

import { Download, LogOut, Plus, RefreshCw, Utensils } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { formatDateTime, formatMoney, todayIsoDate } from "@/lib/date";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { DailyMenuItem, GuestOrder, OrderStatus, PaymentStatus } from "@/lib/types";

type Tab = "orders" | "menu";

const orderStatuses: OrderStatus[] = ["pending", "approved", "rejected", "cancelled"];

export function AdminDashboard() {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<GuestOrder[]>([]);
  const [menu, setMenu] = useState<DailyMenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filterDate, setFilterDate] = useState(todayIsoDate());
  const [filterStatus, setFilterStatus] = useState<"all" | OrderStatus>("all");
  const [filterPayment, setFilterPayment] = useState<"all" | PaymentStatus>("all");
  const [search, setSearch] = useState("");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        order.employee_code.toLowerCase().includes(query) ||
        order.employee_name.toLowerCase().includes(query);
      const matchesStatus = filterStatus === "all" || order.status === filterStatus;
      const matchesPayment = filterPayment === "all" || order.payment_status === filterPayment;
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [filterPayment, filterStatus, orders, search]);

  async function initialize() {
    if (!supabase) {
      setSessionReady(true);
      return;
    }

    const { data } = await supabase.auth.getSession();
    setSignedIn(Boolean(data.session));
    setSessionReady(true);
  }

  async function loadAdminData() {
    if (!supabase || !signedIn) return;
    setLoading(true);
    setError("");

    const [ordersResult, menuResult] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("order_date", filterDate)
        .order("created_at", { ascending: false }),
      supabase
        .from("daily_menu_items")
        .select("*")
        .eq("menu_date", filterDate)
        .order("created_at", { ascending: true }),
    ]);

    if (ordersResult.error) setError(ordersResult.error.message);
    if (menuResult.error) setError(menuResult.error.message);

    setOrders((ordersResult.data as GuestOrder[]) ?? []);
    setMenu(menuResult.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [filterDate, signedIn]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("Supabase is not configured. Add .env.local values first.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      return;
    }

    setSignedIn(true);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setSignedIn(false);
  }

  async function updateOrder(
    orderId: string,
    values: Partial<Pick<GuestOrder, "status" | "payment_status" | "payment_mode" | "admin_note">>,
  ) {
    if (!supabase) return;
    const { error: updateError } = await supabase.from("orders").update(values).eq("id", orderId);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadAdminData();
  }

  async function addMenuItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!supabase) return;
    const formData = new FormData(event.currentTarget);
    const availableQuantity = String(formData.get("available_quantity") ?? "").trim();

    const { error: insertError } = await supabase.from("daily_menu_items").insert({
      menu_date: String(formData.get("menu_date")),
      name: String(formData.get("name")).trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      price: Number(formData.get("price")),
      available_quantity: availableQuantity ? Number(availableQuantity) : null,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    event.currentTarget.reset();
    setNotice("Menu item added.");
    await loadAdminData();
  }

  async function toggleMenuItem(item: DailyMenuItem) {
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("daily_menu_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await loadAdminData();
  }

  function exportExcel() {
    const rows = filteredOrders.map((order) => ({
      "Order date": order.order_date,
      "Created at": formatDateTime(order.created_at),
      "Employee code": order.employee_code,
      Name: order.employee_name,
      Items: order.order_items
        .map((item) => `${item.item_name} x ${item.quantity}`)
        .join(", "),
      "Total amount": order.total_amount,
      Status: order.status,
      "Payment status": order.payment_status,
      "Payment mode": order.payment_mode ?? "",
      Note: order.admin_note ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `guest-house-orders-${filterDate}.xlsx`);
  }

  if (!sessionReady) {
    return (
      <main className="app-shell">
        <div className="skeleton" />
      </main>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="app-shell">
        <div className="panel grid">
          <h1>Admin dashboard</h1>
          <div className="error">Supabase is not configured. Add values to .env.local and restart the app.</div>
        </div>
      </main>
    );
  }

  if (!signedIn) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="eyebrow">Owner access</span>
            <h1>Admin dashboard</h1>
          </div>
          <a className="button secondary" href="/">
            Resident app
          </a>
        </header>
        <form className="panel form-grid" onSubmit={signIn}>
          <div className="field">
            <label htmlFor="adminEmail">Email</label>
            <input
              id="adminEmail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="adminPassword">Password</label>
            <input
              id="adminPassword"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="button primary" type="submit">
            Sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="eyebrow">Owner records</span>
          <h1>Admin dashboard</h1>
        </div>
        <nav className="nav-actions" aria-label="Admin navigation">
          <a className="button secondary" href="/">
            Resident app
          </a>
          <button className="icon-button" type="button" onClick={signOut} aria-label="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </nav>
      </header>

      <div className="tabs" role="tablist" aria-label="Admin sections">
        <button className={`tab ${tab === "orders" ? "active" : ""}`} type="button" onClick={() => setTab("orders")}>
          Orders
        </button>
        <button className={`tab ${tab === "menu" ? "active" : ""}`} type="button" onClick={() => setTab("menu")}>
          Daily menu
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {notice ? <div className="success">{notice}</div> : null}

      {tab === "orders" ? (
        <section className="panel grid" aria-labelledby="orders-heading">
          <div className="order-heading">
            <div>
              <p className="eyebrow">Food logbook</p>
              <h2 id="orders-heading">Orders</h2>
            </div>
            <button className="icon-button" type="button" onClick={loadAdminData} aria-label="Refresh orders">
              <RefreshCw size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="admin-toolbar">
            <div className="field">
              <label htmlFor="search">Search employee</label>
              <input
                id="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Code or name"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="filterDate">Date</label>
              <input
                id="filterDate"
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="filterStatus">Status</label>
              <select
                id="filterStatus"
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value as "all" | OrderStatus)}
              >
                <option value="all">All</option>
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="filterPayment">Payment</label>
              <select
                id="filterPayment"
                value={filterPayment}
                onChange={(event) => setFilterPayment(event.target.value as "all" | PaymentStatus)}
              >
                <option value="all">All</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>

          <button className="button primary" type="button" onClick={exportExcel} disabled={filteredOrders.length === 0}>
            <Download size={18} aria-hidden="true" />
            Export Excel
          </button>

          {loading ? (
            <div className="grid">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="notice">No orders match these filters.</div>
          ) : (
            <>
              <div className="mobile-orders order-list">
                {filteredOrders.map((order) => (
                  <OrderCard key={order.id} order={order} onUpdate={updateOrder} />
                ))}
              </div>
              <div className="table-wrap">
                <table className="desktop-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.employee_name}</strong>
                          <p className="muted">{order.employee_code}</p>
                          <p className="muted">{formatDateTime(order.created_at)}</p>
                        </td>
                        <td>
                          {order.order_items.map((item) => (
                            <p key={item.id}>
                              {item.item_name} x {item.quantity}
                            </p>
                          ))}
                        </td>
                        <td>{formatMoney(order.total_amount)}</td>
                        <td>
                          <StatusBadge value={order.status} />
                        </td>
                        <td>
                          <PaymentControls order={order} onUpdate={updateOrder} />
                        </td>
                        <td>
                          <StatusControls order={order} onUpdate={updateOrder} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : (
        <section className="grid two-column" aria-labelledby="menu-heading">
          <form className="panel form-grid" onSubmit={addMenuItem}>
            <div>
              <p className="eyebrow">Daily availability</p>
              <h2 id="menu-heading">Add menu item</h2>
            </div>
            <input type="hidden" name="menu_date" value={filterDate} />
            <div className="field">
              <label htmlFor="itemName">Item name</label>
              <input id="itemName" name="name" autoComplete="off" required />
            </div>
            <div className="field">
              <label htmlFor="itemDescription">Description</label>
              <textarea id="itemDescription" name="description" />
            </div>
            <div className="inline-fields">
              <div className="field">
                <label htmlFor="price">Price</label>
                <input id="price" name="price" type="number" min="1" step="1" required />
              </div>
              <div className="field">
                <label htmlFor="availableQuantity">Quantity</label>
                <input id="availableQuantity" name="available_quantity" type="number" min="1" step="1" />
              </div>
            </div>
            <button className="button primary" type="submit">
              <Plus size={18} aria-hidden="true" />
              Add item
            </button>
          </form>

          <div className="panel grid">
            <div className="order-heading">
              <div>
                <p className="eyebrow">{filterDate}</p>
                <h2>Menu items</h2>
              </div>
              <Utensils size={22} aria-hidden="true" />
            </div>
            {menu.length === 0 ? (
              <div className="notice">No items added for this date.</div>
            ) : (
              <div className="menu-list">
                {menu.map((item) => (
                  <article className="card menu-item" key={item.id}>
                    <div className="item-meta">
                      <h3>{item.name}</h3>
                      <p className="price">{formatMoney(item.price)}</p>
                      <p className="muted">
                        {item.available_quantity ?? "Unlimited"} quantity · {item.is_active ? "Active" : "Hidden"}
                      </p>
                    </div>
                    <button className="button secondary" type="button" onClick={() => toggleMenuItem(item)}>
                      {item.is_active ? "Hide" : "Show"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

function OrderCard({
  order,
  onUpdate,
}: {
  order: GuestOrder;
  onUpdate: (
    orderId: string,
    values: Partial<Pick<GuestOrder, "status" | "payment_status" | "payment_mode" | "admin_note">>,
  ) => Promise<void>;
}) {
  return (
    <article className="card order-card">
      <div className="order-heading">
        <div>
          <h3>{order.employee_name}</h3>
          <p className="muted">{order.employee_code}</p>
          <p className="muted">{formatDateTime(order.created_at)}</p>
        </div>
        <StatusBadge value={order.status} />
      </div>
      <div>
        {order.order_items.map((item) => (
          <p key={item.id}>
            {item.item_name} x {item.quantity}
          </p>
        ))}
      </div>
      <strong>{formatMoney(order.total_amount)}</strong>
      <PaymentControls order={order} onUpdate={onUpdate} />
      <StatusControls order={order} onUpdate={onUpdate} />
    </article>
  );
}

function StatusBadge({ value }: { value: OrderStatus | PaymentStatus }) {
  return <span className={`status ${value}`}>{value}</span>;
}

function StatusControls({
  order,
  onUpdate,
}: {
  order: GuestOrder;
  onUpdate: (orderId: string, values: Partial<Pick<GuestOrder, "status">>) => Promise<void>;
}) {
  return (
    <div className="order-actions" aria-label={`Status actions for ${order.employee_name}`}>
      {orderStatuses.map((status) => (
        <button
          className={status === "rejected" || status === "cancelled" ? "button danger" : "button secondary"}
          type="button"
          key={status}
          onClick={() => onUpdate(order.id, { status })}
          disabled={order.status === status}
        >
          {status}
        </button>
      ))}
    </div>
  );
}

function PaymentControls({
  order,
  onUpdate,
}: {
  order: GuestOrder;
  onUpdate: (
    orderId: string,
    values: Partial<Pick<GuestOrder, "payment_status" | "payment_mode">>,
  ) => Promise<void>;
}) {
  return (
    <div className="form-grid">
      <StatusBadge value={order.payment_status} />
      <div className="inline-fields">
        <div className="field">
          <label htmlFor={`payment-${order.id}`}>Payment</label>
          <select
            id={`payment-${order.id}`}
            value={order.payment_status}
            onChange={(event) =>
              onUpdate(order.id, { payment_status: event.target.value as PaymentStatus })
            }
          >
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={`mode-${order.id}`}>Mode</label>
          <select
            id={`mode-${order.id}`}
            value={order.payment_mode ?? ""}
            onChange={(event) => onUpdate(order.id, { payment_mode: event.target.value || null })}
          >
            <option value="">Not set</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="salary_deduction">Salary deduction</option>
          </select>
        </div>
      </div>
    </div>
  );
}

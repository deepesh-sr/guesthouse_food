"use client";

import { Download, LogOut, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { InventoryFilters } from "@/components/inventory-filters";
import { StockBadge } from "@/components/material-table";
import { NpclShell } from "@/components/npcl-shell";
import { formatDateTime } from "@/lib/date";
import {
  filterMaterials,
  formatNumber,
  getStockStatus,
  getStockStatusLabel,
  materialCategories,
} from "@/lib/materials";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Material, MaterialFormValues, StockStatus } from "@/lib/types";

const emptyForm: MaterialFormValues = {
  name: "",
  category: "Fasteners",
  unit: "pcs",
  quantity: 0,
  minimum_stock: 0,
  location: "",
};

export function AdminInventoryDashboard() {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState<MaterialFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<MaterialFormValues>(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<"all" | StockStatus>("all");
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filteredMaterials = useMemo(
    () => filterMaterials(materials, { query, category, stock }),
    [category, materials, query, stock],
  );

  async function initialize() {
    if (!supabase) {
      setSessionReady(true);
      return;
    }
    const { data } = await supabase.auth.getSession();
    setSignedIn(Boolean(data.session));
    setSessionReady(true);
  }

  async function loadMaterials() {
    if (!supabase || !signedIn) return;
    setLoading(true);
    setError("");
    const { data, error: materialsError } = await supabase
      .from("materials")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (materialsError) {
      setError(materialsError.message);
    } else {
      setMaterials(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    void loadMaterials();
  }, [signedIn]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSigningIn(true);

    if (!supabase) {
      setError("Supabase is not configured. Add .env.local values first.");
      setSigningIn(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setSigningIn(false);
      return;
    }

    setSignedIn(true);
    setSigningIn(false);
  }

  async function signOut() {
    setSigningOut(true);
    await supabase?.auth.signOut();
    setSignedIn(false);
    setSigningOut(false);
  }

  async function addMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError("");
    setNotice("");

    const { error: insertError } = await supabase.from("materials").insert(toDbPayload(form));
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setNotice("Material added.");
    await loadMaterials();
    setSaving(false);
  }

  function startEdit(material: Material) {
    setEditingId(material.id);
    setConfirmDeleteId(null);
    setEditDraft({
      name: material.name,
      category: material.category,
      unit: material.unit,
      quantity: material.quantity,
      minimum_stock: material.minimum_stock,
      location: material.location,
    });
  }

  async function saveEdit(materialId: string) {
    if (!supabase) return;
    setSavingRowId(materialId);
    setError("");
    const { error: updateError } = await supabase
      .from("materials")
      .update(toDbPayload(editDraft))
      .eq("id", materialId);

    if (updateError) {
      setError(updateError.message);
      setSavingRowId(null);
      return;
    }

    setEditingId(null);
    setNotice("Material updated.");
    await loadMaterials();
    setSavingRowId(null);
  }

  async function deleteMaterial(materialId: string) {
    if (!supabase) return;
    setDeletingId(materialId);
    setError("");
    const { error: deleteError } = await supabase.from("materials").delete().eq("id", materialId);
    if (deleteError) {
      setError(deleteError.message);
      setDeletingId(null);
      return;
    }
    setConfirmDeleteId(null);
    setNotice("Material deleted.");
    await loadMaterials();
    setDeletingId(null);
  }

  function exportExcel() {
    const rows = filteredMaterials.map((material) => {
      const status = getStockStatus(material);
      return {
        "Material name": material.name,
        Category: material.category,
        Unit: material.unit,
        Quantity: material.quantity,
        "Minimum stock": material.minimum_stock,
        Location: material.location,
        Status: getStockStatusLabel(status),
        "Last updated": formatDateTime(material.updated_at),
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "NPCL Materials");
    XLSX.writeFile(workbook, "npcl-material-inventory.xlsx");
  }

  if (!sessionReady) {
    return (
      <NpclShell action={null}>
        <div className="skeleton" />
      </NpclShell>
    );
  }

  if (!isSupabaseConfigured || !supabase) {
    return (
      <NpclShell action={null}>
        <div className="panel grid">
          <h1>NPCL admin dashboard</h1>
          <div className="error">
            <strong>Supabase is not configured.</strong>
            <span>Add values to .env.local and restart the app.</span>
          </div>
        </div>
      </NpclShell>
    );
  }

  if (!signedIn) {
    return (
      <NpclShell eyebrow="Admin access" action={<a className="button secondary" href="/">Public dashboard</a>}>
        <form className="panel auth-panel form-grid" onSubmit={signIn}>
          <div>
            <p className="eyebrow">Secure inventory controls</p>
            <h1>Admin sign in</h1>
          </div>
          <div className="field">
            <label htmlFor="adminEmail">Email</label>
            <input
              id="adminEmail"
              type="email"
              autoComplete="email"
              spellCheck={false}
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
          {error ? (
            <div className="error">
              <strong>Could not sign in.</strong>
              <span>{error}</span>
            </div>
          ) : null}
          <button className="button primary" type="submit" disabled={signingIn} aria-busy={signingIn}>
            {signingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </NpclShell>
    );
  }

  return (
    <NpclShell
      eyebrow="Admin inventory"
      action={
        <>
          <a className="button secondary" href="/">Public dashboard</a>
          <button className="icon-button" type="button" onClick={signOut} disabled={signingOut} aria-label="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </>
      }
    >
      <section className="grid admin-grid">
        <form className="panel form-grid" onSubmit={addMaterial}>
          <div>
            <p className="eyebrow">Material master</p>
            <h1>Add material</h1>
          </div>
          <MaterialFields value={form} onChange={setForm} prefix="new" />
          <button className="button primary" type="submit" disabled={saving} aria-busy={saving}>
            <Plus size={18} aria-hidden="true" />
            {saving ? "Adding..." : "Add material"}
          </button>
        </form>

        <section className="panel grid" aria-labelledby="admin-materials-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Inventory records</p>
              <h2 id="admin-materials-heading">Material table</h2>
            </div>
            <div className="nav-actions">
              <button className="icon-button" type="button" onClick={loadMaterials} disabled={loading} aria-label="Refresh materials">
                <RefreshCw size={18} aria-hidden="true" />
              </button>
              <button className="button primary" type="button" onClick={exportExcel} disabled={filteredMaterials.length === 0}>
                <Download size={18} aria-hidden="true" />
                Export Excel
              </button>
            </div>
          </div>

          <InventoryFilters
            query={query}
            category={category}
            stock={stock}
            onQueryChange={setQuery}
            onCategoryChange={setCategory}
            onStockChange={setStock}
          />

          {error ? (
            <div className="error">
              <strong>Inventory action failed.</strong>
              <span>{error}</span>
            </div>
          ) : null}
          {notice ? <div className="success">{notice}</div> : null}

          {error ? null : loading ? (
            <div className="grid" aria-label="Loading materials">
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="empty-state">
              <h3>No materials found</h3>
              <p className="muted">Add a material or clear filters to see the inventory records.</p>
            </div>
          ) : (
            <AdminMaterialList
              materials={filteredMaterials}
              editingId={editingId}
              editDraft={editDraft}
              onEditDraftChange={setEditDraft}
              onStartEdit={startEdit}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={saveEdit}
              savingRowId={savingRowId}
              confirmDeleteId={confirmDeleteId}
              onRequestDelete={setConfirmDeleteId}
              onDelete={deleteMaterial}
              deletingId={deletingId}
            />
          )}
        </section>
      </section>
    </NpclShell>
  );
}

function MaterialFields({
  value,
  onChange,
  prefix,
}: {
  value: MaterialFormValues;
  onChange: (value: MaterialFormValues) => void;
  prefix: string;
}) {
  return (
    <>
      <div className="field">
        <label htmlFor={`${prefix}-name`}>Material name</label>
        <input
          id={`${prefix}-name`}
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="Bolts M12"
          autoComplete="off"
          required
        />
      </div>
      <div className="inline-fields">
        <div className="field">
          <label htmlFor={`${prefix}-category`}>Category</label>
          <select
            id={`${prefix}-category`}
            value={value.category}
            onChange={(event) => onChange({ ...value, category: event.target.value })}
          >
            {materialCategories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-unit`}>Unit</label>
          <input
            id={`${prefix}-unit`}
            value={value.unit}
            onChange={(event) => onChange({ ...value, unit: event.target.value })}
            placeholder="pcs"
            autoComplete="off"
            required
          />
        </div>
      </div>
      <div className="inline-fields">
        <div className="field">
          <label htmlFor={`${prefix}-quantity`}>Quantity</label>
          <input
            id={`${prefix}-quantity`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value.quantity}
            onChange={(event) => onChange({ ...value, quantity: toNonNegativeNumber(event.target.value) })}
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-minimum`}>Minimum stock</label>
          <input
            id={`${prefix}-minimum`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={value.minimum_stock}
            onChange={(event) => onChange({ ...value, minimum_stock: toNonNegativeNumber(event.target.value) })}
            required
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-location`}>Location</label>
        <input
          id={`${prefix}-location`}
          value={value.location}
          onChange={(event) => onChange({ ...value, location: event.target.value })}
          placeholder="Central Store"
          autoComplete="off"
          required
        />
      </div>
    </>
  );
}

function AdminMaterialList({
  materials,
  editingId,
  editDraft,
  onEditDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  savingRowId,
  confirmDeleteId,
  onRequestDelete,
  onDelete,
  deletingId,
}: {
  materials: Material[];
  editingId: string | null;
  editDraft: MaterialFormValues;
  onEditDraftChange: (value: MaterialFormValues) => void;
  onStartEdit: (material: Material) => void;
  onCancelEdit: () => void;
  onSaveEdit: (materialId: string) => Promise<void>;
  savingRowId: string | null;
  confirmDeleteId: string | null;
  onRequestDelete: (materialId: string | null) => void;
  onDelete: (materialId: string) => Promise<void>;
  deletingId: string | null;
}) {
  return (
    <>
      <div className="mobile-materials material-list">
        {materials.map((material) => {
          const editing = editingId === material.id;
          return (
            <article className="card material-card" key={material.id}>
              {editing ? (
                <>
                  <MaterialFields value={editDraft} onChange={onEditDraftChange} prefix={`mobile-edit-${material.id}`} />
                  <div className="order-actions">
                    <button
                      className="button primary"
                      type="button"
                      onClick={() => onSaveEdit(material.id)}
                      disabled={savingRowId === material.id}
                    >
                      <Save size={16} aria-hidden="true" />
                      {savingRowId === material.id ? "Saving..." : "Save"}
                    </button>
                    <button className="button secondary" type="button" onClick={onCancelEdit}>
                      <X size={16} aria-hidden="true" />
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="material-card-head">
                    <div>
                      <p className="eyebrow">{material.category}</p>
                      <h3>{material.name}</h3>
                    </div>
                    <StockBadge status={getStockStatus(material)} />
                  </div>
                  <div className="stock-meter">
                    <strong>{formatNumber(material.quantity)}</strong>
                    <span>{material.unit}</span>
                  </div>
                  <dl className="material-facts">
                    <div>
                      <dt>Minimum</dt>
                      <dd>
                        {formatNumber(material.minimum_stock)} {material.unit}
                      </dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{material.location}</dd>
                    </div>
                    <div>
                      <dt>Updated</dt>
                      <dd>{formatDateTime(material.updated_at)}</dd>
                    </div>
                  </dl>
                  <div className="order-actions">
                    <button className="button secondary" type="button" onClick={() => onStartEdit(material)}>
                      <Pencil size={16} aria-hidden="true" />
                      Edit
                    </button>
                    {confirmDeleteId === material.id ? (
                      <>
                        <button
                          className="button danger"
                          type="button"
                          onClick={() => onDelete(material.id)}
                          disabled={deletingId === material.id}
                        >
                          {deletingId === material.id ? "Deleting..." : "Confirm delete"}
                        </button>
                        <button className="button secondary" type="button" onClick={() => onRequestDelete(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className="button danger" type="button" onClick={() => onRequestDelete(material.id)}>
                        <Trash2 size={16} aria-hidden="true" />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </div>
      <div className="table-wrap">
        <table className="desktop-table admin-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Minimum</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material) => {
              const editing = editingId === material.id;
              return (
                <tr key={material.id}>
                  {editing ? (
                    <>
                      <td colSpan={6}>
                        <div className="inline-edit-grid">
                          <MaterialFields value={editDraft} onChange={onEditDraftChange} prefix={`edit-${material.id}`} />
                        </div>
                      </td>
                      <td>
                        <div className="order-actions">
                          <button
                            className="button primary"
                            type="button"
                            onClick={() => onSaveEdit(material.id)}
                            disabled={savingRowId === material.id}
                          >
                            <Save size={16} aria-hidden="true" />
                            {savingRowId === material.id ? "Saving..." : "Save"}
                          </button>
                          <button className="button secondary" type="button" onClick={onCancelEdit}>
                            <X size={16} aria-hidden="true" />
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <strong>{material.name}</strong>
                        <p className="muted">Updated {formatDateTime(material.updated_at)}</p>
                      </td>
                      <td>{material.category}</td>
                      <td>
                        {formatNumber(material.quantity)} {material.unit}
                      </td>
                      <td>
                        {formatNumber(material.minimum_stock)} {material.unit}
                      </td>
                      <td>{material.location}</td>
                      <td>
                        <StockBadge status={getStockStatus(material)} />
                      </td>
                      <td>
                        <div className="order-actions">
                          <button className="button secondary" type="button" onClick={() => onStartEdit(material)}>
                            <Pencil size={16} aria-hidden="true" />
                            Edit
                          </button>
                          {confirmDeleteId === material.id ? (
                            <>
                              <button
                                className="button danger"
                                type="button"
                                onClick={() => onDelete(material.id)}
                                disabled={deletingId === material.id}
                              >
                                {deletingId === material.id ? "Deleting..." : "Confirm delete"}
                              </button>
                              <button className="button secondary" type="button" onClick={() => onRequestDelete(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button className="button danger" type="button" onClick={() => onRequestDelete(material.id)}>
                              <Trash2 size={16} aria-hidden="true" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function toNonNegativeNumber(value: string) {
  const next = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(next) ? Math.max(0, next) : 0;
}

function toDbPayload(values: MaterialFormValues) {
  return {
    name: values.name.trim(),
    category: values.category,
    unit: values.unit.trim(),
    quantity: values.quantity,
    minimum_stock: values.minimum_stock,
    location: values.location.trim(),
    updated_at: new Date().toISOString(),
  };
}

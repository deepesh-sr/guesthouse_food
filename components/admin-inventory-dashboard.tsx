"use client";

import { Download, LogOut, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { InventoryFilters } from "@/components/inventory-filters";
import { StockBadge } from "@/components/material-table";
import { NpclShell } from "@/components/npcl-shell";
import { loginIdToEmail, testCredentials } from "@/lib/auth";
import { formatDateTime } from "@/lib/date";
import { downloadMaterialsExcel } from "@/lib/export-materials";
import {
  defaultMaterialFormValues,
  filterMaterials,
  formatNumber,
  getStockStatus,
  getSeedMaterialsForTerminal,
  isMissingMaterialsTableError,
  materialSelect,
  normalizeMaterialRow,
  seedCategories,
  seedSubcategories,
  seedUnits,
  subcategoriesForCategory,
  terminals,
} from "@/lib/materials";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Category, Material, MaterialFormValues, StockStatus, Subcategory, Terminal, Unit } from "@/lib/types";

const emptyForm = defaultMaterialFormValues();

export function AdminInventoryDashboard() {
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [assignedTerminal, setAssignedTerminal] = useState<Terminal | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>(seedCategories);
  const [subcategories, setSubcategories] = useState<Subcategory[]>(seedSubcategories);
  const [units, setUnits] = useState<Unit[]>(seedUnits);
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
  const [setupNotice, setSetupNotice] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [newSubcategoryCategoryId, setNewSubcategoryCategoryId] = useState(seedCategories[0]?.id ?? "");
  const [newUnit, setNewUnit] = useState("");

  const filteredMaterials = useMemo(
    () => filterMaterials(materials, { query, category, stock }),
    [category, materials, query, stock],
  );

  const availableCategories = useMemo(() => categories.map((item) => item.name), [categories]);

  async function initialize() {
    if (!supabase) {
      setSessionReady(true);
      return;
    }
    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        new Promise<{ data: { session: null } }>((resolve) =>
          window.setTimeout(() => resolve({ data: { session: null } }), 1800),
        ),
      ]);
      setSignedIn(Boolean(sessionResult.data.session));
      if (sessionResult.data.session) {
        await resolveAssignedTerminal(sessionResult.data.session.user.id, sessionResult.data.session.user.email ?? "");
      }
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Could not check admin session.");
      setSignedIn(false);
    }
    setSessionReady(true);
  }

  async function resolveAssignedTerminal(userId: string, userEmail: string) {
    if (!supabase) return;
    const { data, error: assignmentError } = await supabase
      .from("terminal_admins")
      .select("terminal:terminals(*)")
      .or(`user_id.eq.${userId},admin_email.eq.${userEmail}`)
      .maybeSingle();

    if (assignmentError) {
      if (isMissingMaterialsTableError(assignmentError.message)) {
        setAssignedTerminal(terminals[0]);
        setSetupNotice("Showing sample terminal assignment. Run supabase/schema.sql and add terminal_admins rows.");
      } else {
        setError(assignmentError.message);
      }
      return;
    }

    const terminal = Array.isArray(data?.terminal) ? data?.terminal[0] : data?.terminal;
    setAssignedTerminal((terminal as Terminal | null) ?? null);
  }

  async function loadMasters() {
    if (!supabase || !signedIn) return;
    const [categoriesResult, subcategoriesResult, unitsResult] = await Promise.all([
      supabase.from("categories").select("*").order("name", { ascending: true }),
      supabase.from("subcategories").select("*").order("name", { ascending: true }),
      supabase.from("units").select("*").order("name", { ascending: true }),
    ]);

    const firstError = categoriesResult.error ?? subcategoriesResult.error ?? unitsResult.error;
    if (firstError) {
      if (isMissingMaterialsTableError(firstError.message)) {
        setCategories(seedCategories);
        setSubcategories(seedSubcategories);
        setUnits(seedUnits);
      } else {
        setError(firstError.message);
      }
      return;
    }

    setCategories(categoriesResult.data ?? []);
    setSubcategories(subcategoriesResult.data ?? []);
    setUnits(unitsResult.data ?? []);
  }

  async function loadMaterials() {
    if (!supabase || !signedIn || !assignedTerminal) return;
    setLoading(true);
    setError("");
    setSetupNotice("");
    const { data, error: materialsError } = await supabase
      .from("materials")
      .select(materialSelect())
      .eq("terminal_id", assignedTerminal.id)
      .order("name", { ascending: true });

    if (materialsError) {
      if (isMissingMaterialsTableError(materialsError.message)) {
        setMaterials(getSeedMaterialsForTerminal(assignedTerminal.code));
        setSetupNotice(
          "Showing sample seed data. Admin edits will work after running supabase/schema.sql in Supabase.",
        );
      } else {
        setError(materialsError.message);
      }
    } else {
      setMaterials((data ?? []).map(normalizeMaterialRow));
    }
    setLoading(false);
  }

  useEffect(() => {
    void initialize();
  }, []);

  useEffect(() => {
    void loadMasters();
  }, [signedIn]);

  useEffect(() => {
    void loadMaterials();
  }, [signedIn, assignedTerminal]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSigningIn(true);

    if (!supabase) {
      setError("Supabase is not configured. Add .env.local values first.");
      setSigningIn(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginIdToEmail(loginId),
      password,
    });
    if (signInError) {
      setError(signInError.message);
      setSigningIn(false);
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await resolveAssignedTerminal(userData.user.id, userData.user.email ?? "");
    }
    setSignedIn(true);
    setSigningIn(false);
  }

  async function signOut() {
    setSigningOut(true);
    await supabase?.auth.signOut();
    setSignedIn(false);
    setAssignedTerminal(null);
    setSigningOut(false);
  }

  async function addMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !assignedTerminal) return;
    setSaving(true);
    setError("");
    setNotice("");

    const { error: insertError } = await supabase.from("materials").insert(toDbPayload(form, assignedTerminal.id));
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
      category_id: material.category_id,
      subcategory_id: material.subcategory_id,
      unit_id: material.unit_id,
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
      .update(toDbPayload(editDraft, assignedTerminal?.id))
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

  async function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !newCategory.trim()) return;
    setError("");
    const { data, error: insertError } = await supabase
      .from("categories")
      .insert({ name: newCategory.trim() })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCategories((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewCategory("");
  }

  async function addSubcategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !newSubcategory.trim() || !newSubcategoryCategoryId) return;
    setError("");
    const { data, error: insertError } = await supabase
      .from("subcategories")
      .insert({ name: newSubcategory.trim(), category_id: newSubcategoryCategoryId })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSubcategories((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewSubcategory("");
  }

  async function addUnit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !newUnit.trim()) return;
    setError("");
    const { data, error: insertError } = await supabase
      .from("units")
      .insert({ name: newUnit.trim() })
      .select()
      .single();
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setUnits((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
    setNewUnit("");
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
          <h1>HPCL admin dashboard</h1>
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
      <NpclShell eyebrow="Admin access" action={<a className="button secondary" href="/">Employee access</a>}>
        <form className="panel auth-panel form-grid" onSubmit={signIn}>
          <div>
            <p className="eyebrow">Secure inventory controls</p>
            <h1>Admin sign in</h1>
          </div>
          <div className="field">
            <label htmlFor="adminEmail">Admin ID</label>
            <input
              id="adminEmail"
              autoComplete="username"
              spellCheck={false}
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              placeholder="admin1"
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
              placeholder="admin1234"
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
          <div className="notice credential-hint">
            {testCredentials
              .filter((item) => item.role === "Admin")
              .map((item) => `${item.loginId} / ${item.password} (${item.access})`)
              .join(" | ")}
          </div>
        </form>
      </NpclShell>
    );
  }

  if (!assignedTerminal) {
    return (
      <NpclShell
        eyebrow="Admin inventory"
        action={
          <button className="icon-button" type="button" onClick={signOut} disabled={signingOut} aria-label="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        }
      >
        <section className="panel grid">
          <div>
            <p className="eyebrow">Terminal assignment required</p>
            <h1>No terminal assigned</h1>
          </div>
          <div className="notice">
            Your admin account is not linked to `1979 - HPCL Vijayawada Terminal` or `1915 - HPCL Ramagundam IRD`.
            Add a row in `terminal_admins` for this Supabase user/email.
          </div>
        </section>
      </NpclShell>
    );
  }

  return (
    <NpclShell
      eyebrow="Admin inventory"
      action={
        <>
          <a className="button secondary" href="/">Employee access</a>
          <button className="icon-button" type="button" onClick={signOut} disabled={signingOut} aria-label="Sign out">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </>
      }
    >
      <section className="hero-band admin-terminal-band" aria-label="Assigned terminal">
        <div className="hero-copy">
          <p className="eyebrow">Assigned terminal</p>
          <h1>
            {assignedTerminal.code} - {assignedTerminal.name}
          </h1>
          <p className="muted">All admin edits and downloads are restricted to this terminal.</p>
        </div>
      </section>
      <section className="grid admin-grid">
        <form className="panel form-grid" onSubmit={addMaterial}>
          <div>
            <p className="eyebrow">Material master</p>
            <h1>Add material</h1>
          </div>
          <MaterialFields
            value={form}
            onChange={setForm}
            prefix="new"
            categories={categories}
            subcategories={subcategories}
            units={units}
          />
          <button className="button primary" type="submit" disabled={saving} aria-busy={saving}>
            <Plus size={18} aria-hidden="true" />
            {saving ? "Adding..." : "Add material"}
          </button>
          <MasterControls
            categories={categories}
            newCategory={newCategory}
            setNewCategory={setNewCategory}
            addCategory={addCategory}
            newSubcategory={newSubcategory}
            setNewSubcategory={setNewSubcategory}
            newSubcategoryCategoryId={newSubcategoryCategoryId}
            setNewSubcategoryCategoryId={setNewSubcategoryCategoryId}
            addSubcategory={addSubcategory}
            newUnit={newUnit}
            setNewUnit={setNewUnit}
            addUnit={addUnit}
          />
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
              <button
                className="button primary"
                type="button"
                onClick={() => downloadMaterialsExcel(filteredMaterials)}
                disabled={filteredMaterials.length === 0}
              >
                <Download size={18} aria-hidden="true" />
                DOWNLOAD EXCEL
              </button>
            </div>
          </div>

          <InventoryFilters
            query={query}
            category={category}
            stock={stock}
            categories={availableCategories}
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
          {setupNotice ? (
            <div className="notice">
              <strong>Database setup pending.</strong>
              <span>{setupNotice}</span>
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
              categories={categories}
              subcategories={subcategories}
              units={units}
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
  categories,
  subcategories,
  units,
}: {
  value: MaterialFormValues;
  onChange: (value: MaterialFormValues) => void;
  prefix: string;
  categories: Category[];
  subcategories: Subcategory[];
  units: Unit[];
}) {
  const matchingSubcategories = subcategoriesForCategory(subcategories, value.category_id);
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
            value={value.category_id}
            onChange={(event) => {
              const nextCategoryId = event.target.value;
              const firstSubcategory = subcategoriesForCategory(subcategories, nextCategoryId)[0];
              onChange({ ...value, category_id: nextCategoryId, subcategory_id: firstSubcategory?.id ?? "" });
            }}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${prefix}-subcategory`}>Sub category</label>
          <select
            id={`${prefix}-subcategory`}
            value={value.subcategory_id}
            onChange={(event) => onChange({ ...value, subcategory_id: event.target.value })}
            required
          >
            {matchingSubcategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${prefix}-unit`}>Unit</label>
        <select
          id={`${prefix}-unit`}
          value={value.unit_id}
          onChange={(event) => onChange({ ...value, unit_id: event.target.value })}
          required
        >
          {units.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
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

function MasterControls({
  categories,
  newCategory,
  setNewCategory,
  addCategory,
  newSubcategory,
  setNewSubcategory,
  newSubcategoryCategoryId,
  setNewSubcategoryCategoryId,
  addSubcategory,
  newUnit,
  setNewUnit,
  addUnit,
}: {
  categories: Category[];
  newCategory: string;
  setNewCategory: (value: string) => void;
  addCategory: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  newSubcategory: string;
  setNewSubcategory: (value: string) => void;
  newSubcategoryCategoryId: string;
  setNewSubcategoryCategoryId: (value: string) => void;
  addSubcategory: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  newUnit: string;
  setNewUnit: (value: string) => void;
  addUnit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div className="master-controls">
      <div>
        <p className="eyebrow">Option masters</p>
        <h2>Add options</h2>
      </div>
      <form className="inline-master-form" onSubmit={addCategory}>
        <div className="field">
          <label htmlFor="new-category">New category</label>
          <input
            id="new-category"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="Valves"
            autoComplete="off"
          />
        </div>
        <button className="button secondary" type="submit">
          Add
        </button>
      </form>
      <form className="inline-master-form" onSubmit={addSubcategory}>
        <div className="field">
          <label htmlFor="new-subcategory-category">Category</label>
          <select
            id="new-subcategory-category"
            value={newSubcategoryCategoryId}
            onChange={(event) => setNewSubcategoryCategoryId(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="new-subcategory">New sub category</label>
          <input
            id="new-subcategory"
            value={newSubcategory}
            onChange={(event) => setNewSubcategory(event.target.value)}
            placeholder="Gaskets"
            autoComplete="off"
          />
        </div>
        <button className="button secondary" type="submit">
          Add
        </button>
      </form>
      <form className="inline-master-form" onSubmit={addUnit}>
        <div className="field">
          <label htmlFor="new-unit">New unit</label>
          <input
            id="new-unit"
            value={newUnit}
            onChange={(event) => setNewUnit(event.target.value)}
            placeholder="kg"
            autoComplete="off"
          />
        </div>
        <button className="button secondary" type="submit">
          Add
        </button>
      </form>
    </div>
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
  categories,
  subcategories,
  units,
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
  categories: Category[];
  subcategories: Subcategory[];
  units: Unit[];
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
                  <MaterialFields
                    value={editDraft}
                    onChange={onEditDraftChange}
                    prefix={`mobile-edit-${material.id}`}
                    categories={categories}
                    subcategories={subcategories}
                    units={units}
                  />
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
                      <p className="muted">{material.subcategory}</p>
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
                      <dt>Terminal</dt>
                      <dd>{material.terminal_code}</dd>
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
              <th>Terminal</th>
              <th>Category</th>
              <th>Sub category</th>
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
                      <td colSpan={8}>
                        <div className="inline-edit-grid">
                          <MaterialFields
                            value={editDraft}
                            onChange={onEditDraftChange}
                            prefix={`edit-${material.id}`}
                            categories={categories}
                            subcategories={subcategories}
                            units={units}
                          />
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
                      <td>{material.terminal_code}</td>
                      <td>{material.category}</td>
                      <td>{material.subcategory}</td>
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

function toDbPayload(values: MaterialFormValues, terminalId?: string) {
  return {
    ...(terminalId ? { terminal_id: terminalId } : {}),
    name: values.name.trim(),
    category_id: values.category_id,
    subcategory_id: values.subcategory_id,
    unit_id: values.unit_id,
    quantity: values.quantity,
    minimum_stock: values.minimum_stock,
    location: values.location.trim(),
    updated_at: new Date().toISOString(),
  };
}

"use client";

import { Download, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { InventoryFilters } from "@/components/inventory-filters";
import { MaterialCards, MaterialTable } from "@/components/material-table";
import { NpclShell } from "@/components/npcl-shell";
import { loginIdToEmail, testCredentials } from "@/lib/auth";
import { downloadMaterialsExcel } from "@/lib/export-materials";
import {
  filterMaterials,
  getStockStatus,
  isMissingMaterialsTableError,
  materialSelect,
  normalizeMaterialRow,
} from "@/lib/materials";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { Material, StockStatus, Terminal, UserProfile } from "@/lib/types";

export function PublicInventoryDashboard() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allowedTerminals, setAllowedTerminals] = useState<Terminal[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<"all" | StockStatus>("all");
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");
  const [setupNotice, setSetupNotice] = useState("");
  const [sessionReady, setSessionReady] = useState(false);

  const filteredMaterials = useMemo(
    () => filterMaterials(materials, { query, category, stock }),
    [category, materials, query, stock],
  );

  const availableCategories = useMemo(
    () => Array.from(new Set(materials.map((material) => material.category))).sort(),
    [materials],
  );

  const lowStockCount = materials.filter((material) => getStockStatus(material) === "low_stock").length;
  const outOfStockCount = materials.filter((material) => getStockStatus(material) === "out_of_stock").length;

  useEffect(() => {
    async function initializeSession() {
      if (!supabase) {
        setSessionReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        await loadEmployeeAccess();
      }
      setSessionReady(true);
    }

    void initializeSession();
  }, []);

  async function loadEmployeeAccess() {
    if (!supabase) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data: profileData, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .or(`user_id.eq.${userData.user.id},email.eq.${userData.user.email ?? ""}`)
      .maybeSingle();
    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfile(profileData as UserProfile | null);

    const { data: accessData, error: accessError } = await supabase
      .from("employee_terminal_access")
      .select("terminal:terminals(*)")
      .or(`user_id.eq.${userData.user.id},employee_email.eq.${userData.user.email ?? ""}`);

    if (accessError) {
      setError(accessError.message);
      return;
    }

    const terminals = (accessData ?? [])
      .map((row: any) => (Array.isArray(row.terminal) ? row.terminal[0] : row.terminal))
      .filter(Boolean) as Terminal[];
    setAllowedTerminals(terminals);
    if (terminals.length === 1) {
      setSelectedTerminal(terminals[0]);
      void loadMaterials(terminals[0]);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSetupNotice("");
    setSigningIn(true);

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured. Add your project URL and publishable key to .env.local.");
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

    await loadEmployeeAccess();
    setSigningIn(false);
  }

  async function signOut() {
    await supabase?.auth.signOut();
    setProfile(null);
    setAllowedTerminals([]);
    setSelectedTerminal(null);
    setMaterials([]);
  }

  async function loadMaterials(terminal: Terminal) {
    setLoading(true);
    setError("");
    setSetupNotice("");

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setError("Supabase is not configured. Add your project URL and publishable key to .env.local.");
      return;
    }

    const { data, error: materialsError } = await supabase
      .from("materials")
      .select(materialSelect())
      .eq("terminal_id", terminal.id)
      .order("name", { ascending: true });

    if (materialsError) {
      if (isMissingMaterialsTableError(materialsError.message)) {
        setError("Database setup pending. Run supabase/schema.sql once in Supabase.");
      } else {
        setError(materialsError.message);
      }
    } else {
      setMaterials((data ?? []).map(normalizeMaterialRow));
    }

    setLoading(false);
  }

  function openTerminal(terminal: Terminal) {
    setSelectedTerminal(terminal);
    setCategory("all");
    setStock("all");
    setQuery("");
    void loadMaterials(terminal);
  }

  return (
    <NpclShell
      action={
        <a className="button secondary" href="/hpcl/admin">
          <ShieldCheck size={18} aria-hidden="true" />
          Admin login
        </a>
      }
    >
      <section className="hero-band" aria-labelledby="dashboard-heading">
        <div className="hero-copy">
          <p className="eyebrow">Employee access</p>
          <h1 id="dashboard-heading">HPCL MATERIAL INVENTORY DASHBOARD</h1>
          <p className="muted">
            Sign in with employee ID and password to view assigned terminal inventory records.
          </p>
          {profile ? <p className="terminal-chip">Signed in as {profile.display_name}</p> : null}
          {selectedTerminal ? (
            <p className="terminal-chip">
              Terminal {selectedTerminal.code}: {selectedTerminal.name}
            </p>
          ) : null}
        </div>
        {profile && selectedTerminal ? (
          <div className="metrics-strip" aria-label="Inventory summary">
            <Metric label="Total Available Material" value={materials.length} />
            <Metric
              label="Low in Stock Material"
              value={lowStockCount}
              tone={lowStockCount > 0 ? "warning" : "success"}
            />
            <Metric
              label="Out of Stock Material"
              value={outOfStockCount}
              tone={outOfStockCount > 0 ? "danger" : "success"}
            />
          </div>
        ) : !sessionReady ? (
          <div className="terminal-gate">
            <div className="skeleton" />
          </div>
        ) : profile ? (
          <TerminalGate allowedTerminals={allowedTerminals} openTerminal={openTerminal} signOut={signOut} />
        ) : (
          <EmployeeLogin
            loginId={loginId}
            setLoginId={setLoginId}
            password={password}
            setPassword={setPassword}
            signIn={signIn}
            signingIn={signingIn}
          />
        )}
      </section>

      {selectedTerminal ? (
        <section className="panel grid" aria-labelledby="materials-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Employee inventory ledger</p>
            <h2 id="materials-heading">
              Terminal {selectedTerminal.code} Material table
            </h2>
          </div>
          <div className="nav-actions">
            <button className="button secondary" type="button" onClick={() => {
              setSelectedTerminal(null);
              setMaterials([]);
            }}>
              Change terminal
            </button>
            <button className="button secondary" type="button" onClick={signOut}>
              Sign out
            </button>
            <button className="icon-button" type="button" onClick={() => loadMaterials(selectedTerminal)} disabled={loading} aria-label="Refresh materials">
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

        {setupNotice ? (
          <div className="notice">
            <strong>Database setup pending.</strong>
            <span>{setupNotice}</span>
          </div>
        ) : null}

        {error ? (
          <div className="error">
            <strong>Could not load materials.</strong>
            <span>{error}</span>
          </div>
        ) : loading ? (
          <div className="grid" aria-label="Loading materials">
            <div className="skeleton" />
            <div className="skeleton" />
            <div className="skeleton" />
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="empty-state">
            <Zap size={28} aria-hidden="true" />
            <h3>No materials match these filters</h3>
            <p className="muted">Clear search or filters to view the current HPCL inventory list.</p>
          </div>
        ) : (
          <>
            <MaterialCards materials={filteredMaterials} />
            <MaterialTable materials={filteredMaterials} />
          </>
        )}
      </section>
      ) : error ? (
        <div className="error">
          <strong>Terminal access failed.</strong>
          <span>{error}</span>
        </div>
      ) : null}
    </NpclShell>
  );
}

function EmployeeLogin({
  loginId,
  setLoginId,
  password,
  setPassword,
  signIn,
  signingIn,
}: {
  loginId: string;
  setLoginId: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  signIn: (event: FormEvent<HTMLFormElement>) => void;
  signingIn: boolean;
}) {
  return (
    <form className="terminal-gate" onSubmit={signIn}>
      <div>
        <p className="eyebrow">Employee login</p>
        <h2>Enter employee credentials</h2>
      </div>
      <div className="field">
        <label htmlFor="employee-login-id">Employee ID</label>
        <input
          id="employee-login-id"
          value={loginId}
          onChange={(event) => setLoginId(event.target.value)}
          placeholder="employee1"
          autoComplete="username"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="employee-password">Password</label>
        <input
          id="employee-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="employee1234"
          autoComplete="current-password"
          required
        />
      </div>
      <button className="button primary" type="submit" disabled={signingIn}>
        {signingIn ? "Signing in..." : "Sign in"}
      </button>
      <div className="notice credential-hint">
        {testCredentials
          .filter((item) => item.role === "Employee")
          .map((item) => `${item.loginId} / ${item.password} (${item.access})`)
          .join(" | ")}
      </div>
    </form>
  );
}

function TerminalGate({
  allowedTerminals,
  openTerminal,
  signOut,
}: {
  allowedTerminals: Terminal[];
  openTerminal: (terminal: Terminal) => void;
  signOut: () => void;
}) {
  return (
    <div className="terminal-gate">
      <div>
        <p className="eyebrow">Select terminal</p>
        <h2>Choose assigned terminal</h2>
      </div>
      <div className="terminal-options">
        {allowedTerminals.map((terminal) => (
          <button
            className="button secondary"
            key={terminal.code}
            type="button"
            onClick={() => openTerminal(terminal)}
          >
            {terminal.code} - {terminal.name}
          </button>
        ))}
      </div>
      {allowedTerminals.length === 0 ? <div className="error">No terminal access assigned to this employee.</div> : null}
      <button className="button primary" type="button" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <div className={`metric ${tone}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

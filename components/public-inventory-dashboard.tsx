"use client";

import { Download, RefreshCw, ShieldCheck, Zap } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { InventoryFilters } from "@/components/inventory-filters";
import { MaterialCards, MaterialTable } from "@/components/material-table";
import { NpclShell } from "@/components/npcl-shell";
import { downloadMaterialsExcel } from "@/lib/export-materials";
import {
  filterMaterials,
  getSeedMaterialsForTerminal,
  getStockStatus,
  getTerminalByCode,
  isMissingMaterialsTableError,
  normalizeMaterialRow,
  terminals,
} from "@/lib/materials";
import { isSupabaseConfigured, publicSupabase } from "@/lib/supabase";
import type { Material, StockStatus, Terminal } from "@/lib/types";

export function PublicInventoryDashboard() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [terminalCode, setTerminalCode] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<"all" | StockStatus>("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [setupNotice, setSetupNotice] = useState("");

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

  async function loadMaterials(terminal: Terminal) {
    setLoading(true);
    setError("");
    setSetupNotice("");

    if (!isSupabaseConfigured || !publicSupabase) {
      setLoading(false);
      setMaterials(getSeedMaterialsForTerminal(terminal.code));
      setSetupNotice("Showing sample terminal data. Add Supabase values and run supabase/schema.sql for live records.");
      return;
    }

    const { data, error: materialsError } = await publicSupabase.rpc("get_terminal_materials", {
      input_terminal_code: terminal.code,
    });

    if (materialsError) {
      if (isMissingMaterialsTableError(materialsError.message)) {
        setMaterials(getSeedMaterialsForTerminal(terminal.code));
        setSetupNotice(
          "Showing sample terminal data. Run supabase/schema.sql once in Supabase to create the live terminal inventory.",
        );
      } else {
        setError(materialsError.message);
      }
    } else {
      setMaterials((data ?? []).map(normalizeMaterialRow));
    }

    setLoading(false);
  }

  function openTerminal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const terminal = getTerminalByCode(terminalCode);
    if (!terminal) {
      setError("Enter a valid terminal code: 1979 or 1915.");
      setMaterials([]);
      setSelectedTerminal(null);
      return;
    }
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
            Select a terminal to view its material availability, stock status, and exportable inventory records.
          </p>
          {selectedTerminal ? (
            <p className="terminal-chip">
              Terminal {selectedTerminal.code}: {selectedTerminal.name}
            </p>
          ) : null}
        </div>
        {selectedTerminal ? (
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
        ) : (
          <TerminalGate
            terminalCode={terminalCode}
            setTerminalCode={setTerminalCode}
            openTerminal={openTerminal}
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
            <button className="button secondary" type="button" onClick={() => setSelectedTerminal(null)}>
              Change terminal
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

function TerminalGate({
  terminalCode,
  setTerminalCode,
  openTerminal,
}: {
  terminalCode: string;
  setTerminalCode: (value: string) => void;
  openTerminal: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="terminal-gate" onSubmit={openTerminal}>
      <div>
        <p className="eyebrow">Select terminal</p>
        <h2>Enter terminal code</h2>
      </div>
      <div className="field">
        <label htmlFor="terminal-code">Terminal code or name</label>
        <input
          id="terminal-code"
          value={terminalCode}
          onChange={(event) => setTerminalCode(event.target.value)}
          placeholder="1979 or 1915"
          autoComplete="off"
          required
        />
      </div>
      <div className="terminal-options">
        {terminals.map((terminal) => (
          <button
            className="button secondary"
            key={terminal.code}
            type="button"
            onClick={() => setTerminalCode(terminal.code)}
          >
            {terminal.code}
          </button>
        ))}
      </div>
      <button className="button primary" type="submit">
        View terminal data
      </button>
    </form>
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

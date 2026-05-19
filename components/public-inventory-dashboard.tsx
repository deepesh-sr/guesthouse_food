"use client";

import { RefreshCw, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InventoryFilters } from "@/components/inventory-filters";
import { MaterialCards, MaterialTable } from "@/components/material-table";
import { NpclShell } from "@/components/npcl-shell";
import { filterMaterials, getStockStatus, isMissingMaterialsTableError, seedMaterials } from "@/lib/materials";
import { isSupabaseConfigured, publicSupabase } from "@/lib/supabase";
import type { Material, StockStatus } from "@/lib/types";

export function PublicInventoryDashboard() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [stock, setStock] = useState<"all" | StockStatus>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [setupNotice, setSetupNotice] = useState("");

  const filteredMaterials = useMemo(
    () => filterMaterials(materials, { query, category, stock }),
    [category, materials, query, stock],
  );

  const lowStockCount = materials.filter((material) => getStockStatus(material) === "low_stock").length;
  const outOfStockCount = materials.filter((material) => getStockStatus(material) === "out_of_stock").length;

  async function loadMaterials() {
    setLoading(true);
    setError("");
    setSetupNotice("");

    if (!isSupabaseConfigured || !publicSupabase) {
      setLoading(false);
      setError("Supabase is not configured. Add your project URL and publishable key to .env.local.");
      return;
    }

    const { data, error: materialsError } = await publicSupabase
      .from("materials")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });

    if (materialsError) {
      if (isMissingMaterialsTableError(materialsError.message)) {
        setMaterials(seedMaterials);
        setSetupNotice(
          "Showing sample seed data. Run supabase/schema.sql once in Supabase to create the live materials table.",
        );
      } else {
        setError(materialsError.message);
      }
    } else {
      setMaterials(data ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    void loadMaterials();
  }, []);

  return (
    <NpclShell>
      <section className="hero-band" aria-labelledby="dashboard-heading">
        <div className="hero-copy">
          <p className="eyebrow">Public material availability</p>
          <h1 id="dashboard-heading">NPCL material stock dashboard</h1>
          <p className="muted">
            Track essential utility materials such as fasteners, cable accessories, and distribution spares.
          </p>
        </div>
        <div className="metrics-strip" aria-label="Inventory summary">
          <Metric label="Materials" value={materials.length} />
          <Metric label="Low stock" value={lowStockCount} tone={lowStockCount > 0 ? "warning" : "success"} />
          <Metric label="Out" value={outOfStockCount} tone={outOfStockCount > 0 ? "danger" : "success"} />
        </div>
      </section>

      <section className="panel grid" aria-labelledby="materials-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Inventory ledger</p>
            <h2 id="materials-heading">Material table</h2>
          </div>
          <button className="icon-button" type="button" onClick={loadMaterials} disabled={loading} aria-label="Refresh materials">
            <RefreshCw size={18} aria-hidden="true" />
          </button>
        </div>

        <InventoryFilters
          query={query}
          category={category}
          stock={stock}
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
            <p className="muted">Clear search or filters to view the current NPCL inventory list.</p>
          </div>
        ) : (
          <>
            <MaterialCards materials={filteredMaterials} />
            <MaterialTable materials={filteredMaterials} />
          </>
        )}
      </section>
    </NpclShell>
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

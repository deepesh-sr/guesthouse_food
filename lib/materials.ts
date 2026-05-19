import type { Material, StockStatus } from "@/lib/types";

export const materialCategories = [
  "Fasteners",
  "Cable Accessories",
  "Electrical",
  "Protection",
  "Distribution",
  "Tools",
];

export const seedMaterials: Material[] = [
  {
    id: "seed-bolts-m12",
    name: "Bolts M12",
    category: "Fasteners",
    unit: "pcs",
    quantity: 240,
    minimum_stock: 60,
    location: "Central Store",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "seed-nuts-m12",
    name: "Nuts M12",
    category: "Fasteners",
    unit: "pcs",
    quantity: 320,
    minimum_stock: 75,
    location: "Central Store",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "seed-washers-m12",
    name: "Flat Washers M12",
    category: "Fasteners",
    unit: "pcs",
    quantity: 0,
    minimum_stock: 80,
    location: "Central Store",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "seed-lt-cable",
    name: "LT Cable Roll 16 sq mm",
    category: "Cable Accessories",
    unit: "m",
    quantity: 180,
    minimum_stock: 50,
    location: "Cable Yard",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "seed-gi-clamps",
    name: "GI Clamps 50 mm",
    category: "Distribution",
    unit: "pcs",
    quantity: 42,
    minimum_stock: 40,
    location: "Line Maintenance Rack",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "seed-copper-lugs",
    name: "Copper Cable Lugs 35 sq mm",
    category: "Electrical",
    unit: "pcs",
    quantity: 28,
    minimum_stock: 30,
    location: "Electrical Store",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "seed-insulation-tape",
    name: "Insulation Tape",
    category: "Protection",
    unit: "rolls",
    quantity: 96,
    minimum_stock: 25,
    location: "Tool Room",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
  {
    id: "seed-junction-box",
    name: "Junction Box 4 Way",
    category: "Distribution",
    unit: "pcs",
    quantity: 14,
    minimum_stock: 10,
    location: "Panel Store",
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  },
];

export function isMissingMaterialsTableError(message: string) {
  return message.includes("public.materials") && message.includes("schema cache");
}

export function getStockStatus(material: Pick<Material, "quantity" | "minimum_stock">): StockStatus {
  if (material.quantity <= 0) return "out_of_stock";
  if (material.quantity <= material.minimum_stock) return "low_stock";
  return "in_stock";
}

export function getStockStatusLabel(status: StockStatus) {
  if (status === "out_of_stock") return "Out of stock";
  if (status === "low_stock") return "Low stock";
  return "In stock";
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function filterMaterials(
  materials: Material[],
  filters: {
    query: string;
    category: string;
    stock: "all" | StockStatus;
  },
) {
  const query = filters.query.trim().toLowerCase();
  return materials.filter((material) => {
    const status = getStockStatus(material);
    const matchesQuery =
      !query ||
      material.name.toLowerCase().includes(query) ||
      material.category.toLowerCase().includes(query) ||
      material.location.toLowerCase().includes(query);
    const matchesCategory = filters.category === "all" || material.category === filters.category;
    const matchesStock = filters.stock === "all" || status === filters.stock;
    return matchesQuery && matchesCategory && matchesStock;
  });
}

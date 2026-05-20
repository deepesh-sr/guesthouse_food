import type { Category, Material, StockStatus, Subcategory, Terminal, Unit } from "@/lib/types";

export const terminals: Terminal[] = [
  {
    id: "11111111-1111-4111-8111-111111111979",
    code: "1979",
    name: "HPCL Vijayawada Terminal",
  },
  {
    id: "11111111-1111-4111-8111-111111111915",
    code: "1915",
    name: "HPCL Ramagundam IRD",
  },
];

export const seedCategories: Category[] = [
  { id: "22222222-2222-4222-8222-000000000001", name: "Fasteners" },
  { id: "22222222-2222-4222-8222-000000000002", name: "Cable Accessories" },
  { id: "22222222-2222-4222-8222-000000000003", name: "Electrical" },
  { id: "22222222-2222-4222-8222-000000000004", name: "Protection" },
  { id: "22222222-2222-4222-8222-000000000005", name: "Distribution" },
  { id: "22222222-2222-4222-8222-000000000006", name: "Tools" },
];

export const seedSubcategories: Subcategory[] = [
  { id: "33333333-3333-4333-8333-000000000001", category_id: seedCategories[0].id, name: "Bolts and Nuts" },
  { id: "33333333-3333-4333-8333-000000000002", category_id: seedCategories[1].id, name: "Cable Rolls" },
  { id: "33333333-3333-4333-8333-000000000003", category_id: seedCategories[2].id, name: "Lugs" },
  { id: "33333333-3333-4333-8333-000000000004", category_id: seedCategories[3].id, name: "Insulation" },
  { id: "33333333-3333-4333-8333-000000000005", category_id: seedCategories[4].id, name: "Junction Boxes" },
  { id: "33333333-3333-4333-8333-000000000006", category_id: seedCategories[5].id, name: "Maintenance Tools" },
];

export const seedUnits: Unit[] = [
  { id: "44444444-4444-4444-8444-000000000001", name: "pcs" },
  { id: "44444444-4444-4444-8444-000000000002", name: "m" },
  { id: "44444444-4444-4444-8444-000000000003", name: "rolls" },
  { id: "44444444-4444-4444-8444-000000000004", name: "sets" },
];

function materialSeed(
  id: string,
  terminal: Terminal,
  name: string,
  category: Category,
  subcategory: Subcategory,
  unit: Unit,
  quantity: number,
  minimum_stock: number,
  location: string,
): Material {
  return {
    id,
    terminal_id: terminal.id,
    terminal_code: terminal.code,
    terminal_name: terminal.name,
    name,
    category_id: category.id,
    category: category.name,
    subcategory_id: subcategory.id,
    subcategory: subcategory.name,
    unit_id: unit.id,
    unit: unit.name,
    quantity,
    minimum_stock,
    location,
    updated_at: "2026-05-19T00:00:00.000Z",
    created_at: "2026-05-19T00:00:00.000Z",
  };
}

export const seedMaterials: Material[] = [
  materialSeed(
    "seed-1979-bolts-m12",
    terminals[0],
    "Bolts M12",
    seedCategories[0],
    seedSubcategories[0],
    seedUnits[0],
    240,
    60,
    "Vijayawada Central Store",
  ),
  materialSeed(
    "seed-1979-nuts-m12",
    terminals[0],
    "Nuts M12",
    seedCategories[0],
    seedSubcategories[0],
    seedUnits[0],
    320,
    75,
    "Vijayawada Central Store",
  ),
  materialSeed(
    "seed-1979-lt-cable",
    terminals[0],
    "LT Cable Roll 16 sq mm",
    seedCategories[1],
    seedSubcategories[1],
    seedUnits[1],
    180,
    50,
    "Vijayawada Cable Yard",
  ),
  materialSeed(
    "seed-1979-insulation-tape",
    terminals[0],
    "Insulation Tape",
    seedCategories[3],
    seedSubcategories[3],
    seedUnits[2],
    96,
    25,
    "Vijayawada Tool Room",
  ),
  materialSeed(
    "seed-1915-washers-m12",
    terminals[1],
    "Flat Washers M12",
    seedCategories[0],
    seedSubcategories[0],
    seedUnits[0],
    0,
    80,
    "Ramagundam Central Store",
  ),
  materialSeed(
    "seed-1915-gi-clamps",
    terminals[1],
    "GI Clamps 50 mm",
    seedCategories[4],
    seedSubcategories[4],
    seedUnits[0],
    42,
    40,
    "Ramagundam Line Rack",
  ),
  materialSeed(
    "seed-1915-copper-lugs",
    terminals[1],
    "Copper Cable Lugs 35 sq mm",
    seedCategories[2],
    seedSubcategories[2],
    seedUnits[0],
    28,
    30,
    "Ramagundam Electrical Store",
  ),
  {
    ...materialSeed(
      "seed-1915-junction-box",
      terminals[1],
      "Junction Box 4 Way",
      seedCategories[4],
      seedSubcategories[4],
      seedUnits[0],
      14,
      10,
      "Ramagundam Panel Store",
    ),
  },
];

export function getTerminalByCode(code: string) {
  const normalized = code.trim().toLowerCase();
  return terminals.find(
    (terminal) => terminal.code.toLowerCase() === normalized || terminal.name.toLowerCase() === normalized,
  );
}

export function getSeedMaterialsForTerminal(code: string) {
  const terminal = getTerminalByCode(code);
  if (!terminal) return [];
  return seedMaterials.filter((material) => material.terminal_code === terminal.code);
}

export function defaultMaterialFormValues(): import("@/lib/types").MaterialFormValues {
  return {
    name: "",
    category_id: seedCategories[0]?.id ?? "",
    subcategory_id: seedSubcategories[0]?.id ?? "",
    unit_id: seedUnits[0]?.id ?? "",
    quantity: 0,
    minimum_stock: 0,
    location: "",
  };
}

export function subcategoriesForCategory(subcategories: Subcategory[], categoryId: string) {
  return subcategories.filter((subcategory) => subcategory.category_id === categoryId);
}

export function normalizeMaterialRow(row: any): Material {
  return {
    id: row.id,
    terminal_id: row.terminal_id,
    terminal_code: row.terminal?.code ?? row.terminal_code ?? "",
    terminal_name: row.terminal?.name ?? row.terminal_name ?? "",
    name: row.name,
    category_id: row.category_id,
    category: row.category?.name ?? row.category ?? "",
    subcategory_id: row.subcategory_id,
    subcategory: row.subcategory?.name ?? row.subcategory ?? "",
    unit_id: row.unit_id,
    unit: row.unit?.name ?? row.unit ?? "",
    quantity: Number(row.quantity),
    minimum_stock: Number(row.minimum_stock),
    location: row.location,
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

export function materialSelect() {
  return "*, terminal:terminals(*), category:categories(*), subcategory:subcategories(*), unit:units(*)";
}

export function isMissingMaterialsTableError(message: string) {
  return (
    message.includes("schema cache") ||
    message.includes("public.materials") ||
    message.includes("public.terminals") ||
    message.includes("public.categories") ||
    message.includes("public.units")
  );
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
      material.subcategory.toLowerCase().includes(query) ||
      material.location.toLowerCase().includes(query);
    const matchesCategory = filters.category === "all" || material.category === filters.category;
    const matchesStock = filters.stock === "all" || status === filters.stock;
    return matchesQuery && matchesCategory && matchesStock;
  });
}

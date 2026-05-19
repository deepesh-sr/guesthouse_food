import type { Material, StockStatus } from "@/lib/types";

export const materialCategories = [
  "Fasteners",
  "Cable Accessories",
  "Electrical",
  "Protection",
  "Distribution",
  "Tools",
];

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

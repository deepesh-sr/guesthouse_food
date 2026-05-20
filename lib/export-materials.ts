import * as XLSX from "xlsx";
import { formatDateTime } from "@/lib/date";
import { getStockStatus, getStockStatusLabel } from "@/lib/materials";
import type { Material } from "@/lib/types";

export function downloadMaterialsExcel(materials: Material[]) {
  const rows = materials.map((material) => {
    const status = getStockStatus(material);
    return {
      "Terminal code": material.terminal_code,
      Terminal: material.terminal_name,
      "Material name": material.name,
      Category: material.category,
      "Sub category": material.subcategory,
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
  XLSX.utils.book_append_sheet(workbook, worksheet, "HPCL Materials");
  XLSX.writeFile(workbook, "hpcl-material-inventory.xlsx");
}

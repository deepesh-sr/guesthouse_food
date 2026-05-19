export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type Material = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  minimum_stock: number;
  location: string;
  updated_at: string;
  created_at: string;
};

export type MaterialFormValues = Omit<Material, "id" | "created_at" | "updated_at">;

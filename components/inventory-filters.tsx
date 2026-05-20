"use client";

import { Search } from "lucide-react";
import type { StockStatus } from "@/lib/types";

export function InventoryFilters({
  query,
  category,
  stock,
  categories,
  onQueryChange,
  onCategoryChange,
  onStockChange,
}: {
  query: string;
  category: string;
  stock: "all" | StockStatus;
  categories: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onStockChange: (value: "all" | StockStatus) => void;
}) {
  return (
    <div className="inventory-toolbar">
      <div className="field search-field">
        <label htmlFor="inventory-search">Search material</label>
        <div className="input-with-icon">
          <Search size={18} aria-hidden="true" />
          <input
            id="inventory-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Bolts, cable, store room"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="category-filter">Category</label>
        <select
          id="category-filter"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="stock-filter">Stock status</label>
        <select
          id="stock-filter"
          value={stock}
          onChange={(event) => onStockChange(event.target.value as "all" | StockStatus)}
        >
          <option value="all">All stock</option>
          <option value="in_stock">In stock</option>
          <option value="low_stock">Low stock</option>
          <option value="out_of_stock">Out of stock</option>
        </select>
      </div>
    </div>
  );
}

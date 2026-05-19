"use client";

import { AlertTriangle, CheckCircle2, CircleOff, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/date";
import { formatNumber, getStockStatus, getStockStatusLabel } from "@/lib/materials";
import type { Material, StockStatus } from "@/lib/types";

export function StockBadge({ status }: { status: StockStatus }) {
  const Icon = status === "out_of_stock" ? CircleOff : status === "low_stock" ? AlertTriangle : CheckCircle2;
  return (
    <span className={`status ${status}`}>
      <Icon size={15} aria-hidden="true" />
      {getStockStatusLabel(status)}
    </span>
  );
}

export function MaterialCards({ materials }: { materials: Material[] }) {
  return (
    <div className="mobile-materials material-list">
      {materials.map((material) => (
        <article className="card material-card" key={material.id}>
          <div className="material-card-head">
            <div>
              <p className="eyebrow">{material.category}</p>
              <h3>{material.name}</h3>
            </div>
            <StockBadge status={getStockStatus(material)} />
          </div>
          <div className="stock-meter" aria-label={`Quantity ${material.quantity} ${material.unit}`}>
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
              <dd>
                <MapPin size={15} aria-hidden="true" />
                {material.location}
              </dd>
            </div>
            <div>
              <dt>Updated</dt>
              <dd>{formatDateTime(material.updated_at)}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}

export function MaterialTable({ materials }: { materials: Material[] }) {
  return (
    <div className="table-wrap">
      <table className="desktop-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Minimum</th>
            <th>Location</th>
            <th>Status</th>
            <th>Last updated</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id}>
              <td>
                <strong>{material.name}</strong>
              </td>
              <td>{material.category}</td>
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
              <td>{formatDateTime(material.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

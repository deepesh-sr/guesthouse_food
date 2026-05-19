import { Building2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export function NpclShell({
  children,
  eyebrow = "Material control room",
  action,
}: {
  children: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <main className="app-shell">
      <header className="npcl-navbar">
        <a className="npcl-brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <Building2 size={24} />
          </span>
          <span>
            <span className="eyebrow">{eyebrow}</span>
            <strong>NPCL : NOIDA POWER COMPANY LIMITED</strong>
          </span>
        </a>
        <nav className="nav-actions" aria-label="Main navigation">
          {action ?? (
            <a className="button secondary" href="/admin">
              <ShieldCheck size={18} aria-hidden="true" />
              Admin
            </a>
          )}
        </nav>
      </header>
      {children}
    </main>
  );
}

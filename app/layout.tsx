import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NPCL Material Inventory",
  description: "Public material stock dashboard and admin inventory records for NPCL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

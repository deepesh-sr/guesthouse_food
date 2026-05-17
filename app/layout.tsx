import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guest House Food",
  description: "Mobile-first food ordering and admin records for a colony guest house.",
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

import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WaterTech Match PIT",
  description: "Matchmaking entre prefeituras e empresas para projetos FEHIDRO"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

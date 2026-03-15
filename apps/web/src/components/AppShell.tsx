"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

function pageLabel(pathname: string) {
  const base = pathname.split("?")[0];
  if (base === "/" || base === "/dashboard") return "Dashboard";
  if (base.startsWith("/empresas")) return "Empresas";
  if (base.startsWith("/prefeituras")) return "Prefeituras";
  if (base.startsWith("/demandas")) return "Demandas";
  if (base.startsWith("/matches")) return "Matches";
  if (base.startsWith("/projetos")) return "Projetos";
  if (base.startsWith("/cadastros")) return "Cadastros";
  if (base.startsWith("/tabelas")) return "Tabelas";
  return "WaterTech Match PIT";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ToastProvider>
      <div className="app-bg">
        <div className="app-frame">
          <div className="topbar">
            <div className="topbar-left">
              <button className="icon-btn md:hidden" type="button" onClick={() => setOpen(true)} aria-label="Abrir menu">
                Menu
              </button>
              <div className="topbar-app">
                <p className="topbar-kicker">WaterTech Match PIT</p>
                <p className="topbar-page">{pageLabel(pathname)}</p>
              </div>
            </div>
            <div className="hidden md:block text-xs text-black/50">Conectando tecnologia a seguranca hidrica.</div>
          </div>

          <div className="app-grid">
            <div className="hidden md:block">
              <Sidebar />
            </div>

            <main className="app-main">{children}</main>
          </div>

          {open ? (
            <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
              <button className="drawer-backdrop" type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" />
              <div className="drawer-panel">
                <Sidebar onNavigate={() => setOpen(false)} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </ToastProvider>
  );
}

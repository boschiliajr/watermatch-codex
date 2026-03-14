"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

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
          <div className="app-topbar">
            <button className="icon-btn md:hidden" type="button" onClick={() => setOpen(true)} aria-label="Abrir menu">
              Menu
            </button>
            <div className="topbar-title">
              <p className="topbar-kicker">WaterTech</p>
              <p className="topbar-name">Match PIT</p>
            </div>
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


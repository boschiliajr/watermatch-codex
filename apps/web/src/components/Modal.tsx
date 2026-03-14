"use client";

import { useEffect } from "react";

export function Modal({
  open,
  title,
  children,
  onClose
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} onClick={onClose} aria-label="Fechar" />
      <div className="relative mx-auto mt-6 w-[min(720px,calc(100%-24px))]">
        <div className="card p-5 md:p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="min-w-0">
              <p className="kicker">Ação</p>
              <h3 className="text-lg md:text-xl font-semibold truncate">{title}</h3>
            </div>
            <button className="icon-btn" type="button" onClick={onClose}>
              Fechar
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}


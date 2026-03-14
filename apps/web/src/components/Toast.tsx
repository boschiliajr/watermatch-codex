"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  title?: string;
  message: string;
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastClass(kind: ToastKind) {
  if (kind === "success") return "toast toast-success";
  if (kind === "error") return "toast toast-error";
  return "toast toast-info";
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    return () => {
      for (const t of timeouts.current.values()) window.clearTimeout(t);
      timeouts.current.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      push: (t) => {
        const id = crypto.randomUUID();
        setItems((prev) => [...prev, { ...t, id }]);
        const handle = window.setTimeout(() => {
          setItems((prev) => prev.filter((x) => x.id !== id));
          timeouts.current.delete(id);
        }, 3500);
        timeouts.current.set(id, handle);
      }
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-relevant="additions removals">
        {items.map((t) => (
          <div key={t.id} className={toastClass(t.kind)} role="status">
            {t.title ? <p className="toast-title">{t.title}</p> : null}
            <p className="toast-message">{t.message}</p>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider />");
  return ctx;
}


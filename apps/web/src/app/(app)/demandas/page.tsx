"use client";

import { useEffect, useState } from "react";
import { DemandsTable } from "@/features/tables/DemandsTable";
import { Modal } from "@/components/Modal";
import { DemandForm } from "@/features/demands/DemandForm";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function DemandasPage() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  async function refreshCount() {
    const res = await supabaseBrowser.from("demands").select("id", { count: "exact", head: true });
    setCount(res.count ?? 0);
  }

  useEffect(() => {
    refreshCount();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="page-title">Demandas</h2>
            <p className="page-subtitle">{count === null ? "Carregando..." : `${count} demandas cadastradas`}</p>
          </div>
          <button className="btn-primary" type="button" onClick={() => setOpen(true)}>
            Nova demanda
          </button>
        </div>
      </header>

      <DemandsTable />

      <Modal
        open={open}
        title="Nova Demanda"
        onClose={() => {
          setOpen(false);
          refreshCount();
        }}
      >
        <DemandForm onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}


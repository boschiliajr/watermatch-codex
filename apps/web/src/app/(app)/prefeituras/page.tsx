"use client";

import { useEffect, useState } from "react";
import { MunicipalitiesTable } from "@/features/tables/MunicipalitiesTable";
import { Modal } from "@/components/Modal";
import { InstitutionForm } from "@/features/institutions/InstitutionForm";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function PrefeiturasPage() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  async function refreshCount() {
    const res = await supabaseBrowser.from("municipalities").select("id", { count: "exact", head: true });
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
            <h2 className="page-title">Prefeituras</h2>
            <p className="page-subtitle">{count === null ? "Carregando..." : `${count} prefeituras cadastradas`}</p>
          </div>
          <button className="btn-primary" type="button" onClick={() => setOpen(true)}>
            Cadastrar prefeitura
          </button>
        </div>
      </header>

      <MunicipalitiesTable />

      <Modal
        open={open}
        title="Cadastrar Prefeitura"
        onClose={() => {
          setOpen(false);
          refreshCount();
        }}
      >
        <InstitutionForm fixedKind="municipality" hideKindSelect onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}


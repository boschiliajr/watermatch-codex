"use client";

import { useEffect, useState } from "react";
import { CompaniesTable } from "@/features/tables/CompaniesTable";
import { Modal } from "@/components/Modal";
import { InstitutionForm } from "@/features/institutions/InstitutionForm";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function EmpresasPage() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  async function refreshCount() {
    const res = await supabaseBrowser.from("companies").select("id", { count: "exact", head: true });
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
            <h2 className="page-title">Empresas</h2>
            <p className="page-subtitle">{count === null ? "Carregando..." : `${count} empresas cadastradas`}</p>
          </div>
          <button className="btn-primary" type="button" onClick={() => setOpen(true)}>
            Cadastrar empresa
          </button>
        </div>
      </header>

      <CompaniesTable />

      <Modal
        open={open}
        title="Cadastrar Empresa"
        onClose={() => {
          setOpen(false);
          refreshCount();
        }}
      >
        <InstitutionForm fixedKind="company" hideKindSelect onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

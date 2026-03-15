"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ProjectsTable } from "@/features/tables/ProjectsTable";
import { Modal } from "@/components/Modal";
import { ProjectForm } from "@/features/projects/ProjectForm";

export default function ProjetosPage() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  async function refreshCount() {
    const res = await supabaseBrowser.from("projects").select("id", { count: "exact", head: true });
    setCount(res.count ?? 0);
  }

  useEffect(() => {
    refreshCount();
  }, []);

  function handleCreated() {
    setOpen(false);
    refreshCount();
    setRefreshKey((v) => v + 1);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="page-title">Projetos</h2>
            <p className="page-subtitle">{count === null ? "Carregando..." : `${count} projetos gerados`}</p>
          </div>
          <button className="btn-primary" type="button" onClick={() => setOpen(true)}>
            Novo projeto
          </button>
        </div>
      </header>

      <ProjectsTable refreshKey={refreshKey} />

      <Modal
        open={open}
        title="Novo Projeto"
        onClose={() => {
          setOpen(false);
        }}
      >
        <ProjectForm onSuccess={handleCreated} />
      </Modal>
    </div>
  );
}


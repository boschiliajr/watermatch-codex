"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export function ProjectsTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabaseBrowser
      .from("projects")
      .select("id, titulo, valor_custo_empresa, margem_pit_percentual, valor_total_fehidro");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    await supabaseBrowser.from("projects").delete().eq("id", deleteId);
    setDeleteId(null);
    load();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Projetos</h4>
        {loading ? <span className="text-xs text-black/50">Carregando...</span> : null}
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-black/60">
            <tr>
              <th className="py-2">Título</th>
              <th className="py-2">Custo</th>
              <th className="py-2">Margem</th>
              <th className="py-2">Total</th>
              <th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="py-2">{row.titulo}</td>
                <td className="py-2">{row.valor_custo_empresa}</td>
                <td className="py-2">{row.margem_pit_percentual}%</td>
                <td className="py-2">{row.valor_total_fehidro}</td>
                <td className="py-2 text-right">
                  <button className="text-coral" onClick={() => setDeleteId(row.id)}>
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <DeleteConfirmModal
        open={Boolean(deleteId)}
        title="Eliminar projeto"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

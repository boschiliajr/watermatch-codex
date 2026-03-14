"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export function CompaniesTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabaseBrowser.from("companies").select("id, cnpj, razao_social, municipio, uf");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/institutions/company/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold">Empresas</h4>
        {loading ? <span className="text-xs text-black/50">Carregando...</span> : null}
      </div>
      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-black/60">
            <tr>
              <th className="py-2">Razão Social</th>
              <th className="py-2">CNPJ</th>
              <th className="py-2">Município</th>
              <th className="py-2">UF</th>
              <th className="py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="py-2">{row.razao_social}</td>
                <td className="py-2">{row.cnpj}</td>
                <td className="py-2">{row.municipio}</td>
                <td className="py-2">{row.uf}</td>
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
        title="Eliminar empresa"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

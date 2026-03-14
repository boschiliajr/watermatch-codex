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
    const { data } = await supabaseBrowser.from("companies").select("id, cnpj, razao_social, municipio, uf, tags_produtos_servicos");
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
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Empresas</h4>
        {loading ? <span className="text-xs text-black/50">Carregando...</span> : null}
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="thead text-left text-black/60">
            <tr>
              <th className="py-3 px-3">CNPJ</th>
              <th className="py-3 px-3">Razão social</th>
              <th className="py-3 px-3">Município</th>
              <th className="py-3 px-3">Tags</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="tr animate-pulse">
                  <td className="py-3 px-3">
                    <div className="h-3 w-28 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-44 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-32 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-40 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="h-3 w-8 rounded bg-black/10 ml-auto" />
                  </td>
                </tr>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="tr">
                  <td className="py-3 px-3">{row.cnpj}</td>
                  <td className="py-3 px-3">{row.razao_social}</td>
                  <td className="py-3 px-3">{row.municipio}</td>
                  <td className="py-3 px-3">
                    <div className="flex flex-wrap gap-2">
                      {(row.tags_produtos_servicos || []).slice(0, 4).map((t: string) => (
                        <span key={t} className="chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="text-coral hover:underline" onClick={() => setDeleteId(row.id)}>
                      🗑
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="tr">
                <td className="py-4 px-3 text-black/60" colSpan={5}>
                  Nenhuma empresa cadastrada.
                </td>
              </tr>
            )}
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

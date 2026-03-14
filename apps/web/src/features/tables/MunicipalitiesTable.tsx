"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export function MunicipalitiesTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabaseBrowser
      .from("municipalities")
      .select("id, nome_prefeitura, cnpj, municipio, uf, bacias_hidrograficas");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    await fetch(`/api/institutions/municipality/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Prefeituras</h4>
        {loading ? <span className="text-xs text-black/50">Carregando...</span> : null}
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="thead text-left text-black/60">
            <tr>
              <th className="py-3 px-3">Prefeitura</th>
              <th className="py-3 px-3">CNPJ</th>
              <th className="py-3 px-3">Municipio</th>
              <th className="py-3 px-3">UF</th>
              <th className="py-3 px-3">Bacias</th>
              <th className="py-3 px-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <tr key={idx} className="tr animate-pulse">
                  <td className="py-3 px-3">
                    <div className="h-3 w-44 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-28 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-32 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-10 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-36 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="h-3 w-8 rounded bg-black/10 ml-auto" />
                  </td>
                </tr>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="tr">
                  <td className="py-3 px-3">{row.nome_prefeitura}</td>
                  <td className="py-3 px-3">{row.cnpj}</td>
                  <td className="py-3 px-3">{row.municipio}</td>
                  <td className="py-3 px-3">{row.uf}</td>
                  <td className="py-3 px-3">
                    {Array.isArray(row.bacias_hidrograficas) ? row.bacias_hidrograficas.join(", ") : ""}
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
                <td className="py-4 px-3 text-black/60" colSpan={6}>
                  Nenhuma prefeitura cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <DeleteConfirmModal
        open={Boolean(deleteId)}
        title="Eliminar prefeitura"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { apiClient } from "@/lib/apiClient";

const PAGE_SIZE = 10;

export function MunicipalitiesTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabaseBrowser
      .from("municipalities")
      .select("id, nome_prefeitura, cnpj, municipio, uf, bacias_hidrograficas")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (query.trim()) q = q.or(`nome_prefeitura.ilike.%${query}%,municipio.ilike.%${query}%,cnpj.ilike.%${query}%`);
    const { data } = await q;
    setRows(data || []);
    setLoading(false);
  }, [page, query, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [refreshKey]);

  async function handleDelete() {
    if (!deleteId) return;
    await apiClient(`/api/municipalities/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h4 className="font-semibold">Prefeituras</h4>
        <input className="input max-w-[280px] mt-0" placeholder="Filtrar por prefeitura, CNPJ ou municipio" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="thead text-left text-black/60">
            <tr>
              <th className="py-3 px-3">CNPJ</th>
              <th className="py-3 px-3">Prefeitura</th>
              <th className="py-3 px-3">Municipio</th>
              <th className="py-3 px-3">Bacia</th>
              <th className="py-3 px-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="tr">
                <td className="py-4 px-3 text-black/60" colSpan={5}>
                  Carregando...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="tr">
                  <td className="py-3 px-3">{row.cnpj}</td>
                  <td className="py-3 px-3">{row.nome_prefeitura}</td>
                  <td className="py-3 px-3">
                    {row.municipio} - {row.uf}
                  </td>
                  <td className="py-3 px-3">
                    {Array.isArray(row.bacias_hidrograficas) && row.bacias_hidrograficas.length ? (
                      <span className="chip chip-primary">{row.bacias_hidrograficas[0]}</span>
                    ) : (
                      <span className="text-black/50 text-sm">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button className="text-coral hover:underline" onClick={() => setDeleteId(row.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="tr">
                <td className="py-4 px-3 text-black/60" colSpan={5}>
                  Nenhuma prefeitura cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end gap-2 mt-3">
        <button className="btn" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
          Anterior
        </button>
        <button className="btn" disabled={rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
          Proxima
        </button>
      </div>
      <DeleteConfirmModal open={Boolean(deleteId)} title="Eliminar prefeitura" onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

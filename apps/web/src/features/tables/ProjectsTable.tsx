"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { apiClient } from "@/lib/apiClient";

const PAGE_SIZE = 10;

export function ProjectsTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabaseBrowser
      .from("projects")
      .select("id, titulo, valor_custo_empresa, margem_pit_percentual, valor_total_fehidro")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (query.trim()) q = q.ilike("titulo", `%${query}%`);
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
    await apiClient(`/api/projects/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h4 className="font-semibold">Projetos</h4>
        <input className="input max-w-[280px] mt-0" placeholder="Filtrar por titulo" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="thead text-left text-black/60">
            <tr>
              <th className="py-3 px-3">Titulo</th>
              <th className="py-3 px-3">Custo</th>
              <th className="py-3 px-3">Margem</th>
              <th className="py-3 px-3">Total</th>
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
                  <td className="py-3 px-3">{row.titulo}</td>
                  <td className="py-3 px-3">{row.valor_custo_empresa}</td>
                  <td className="py-3 px-3">{row.margem_pit_percentual}%</td>
                  <td className="py-3 px-3">{row.valor_total_fehidro}</td>
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
                  Nenhum projeto cadastrado.
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
      <DeleteConfirmModal open={Boolean(deleteId)} title="Eliminar projeto" onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

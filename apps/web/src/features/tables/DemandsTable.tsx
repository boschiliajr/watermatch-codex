"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { apiClient } from "@/lib/apiClient";

const PAGE_SIZE = 10;

export function DemandsTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  function relOne<T>(v: T | T[] | null | undefined): T | null {
    if (!v) return null;
    return Array.isArray(v) ? (v[0] ?? null) : v;
  }

  const load = useCallback(async () => {
    setLoading(true);
    const start = page * PAGE_SIZE;
    const end = start + PAGE_SIZE - 1;

    const { data } = await supabaseBrowser
      .from("demands")
      .select("id, descricao_problema, status, municipalities ( municipio ), tipologia_sugerida ( pdc_codigo, tipologia_codigo )")
      .order("created_at", { ascending: false })
      .range(start, end);

    const baseRows = (data || []) as any[];
    const filtered = query.trim()
      ? baseRows.filter((row) => {
          const m = relOne<{ municipio?: string }>(row.municipalities);
          const q = query.toLowerCase();
          return String(row.descricao_problema || "").toLowerCase().includes(q) || String(m?.municipio || "").toLowerCase().includes(q);
        })
      : baseRows;
    setRows(filtered);
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
    await apiClient(`/api/demands/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h4 className="font-semibold">Demandas</h4>
        <input className="input max-w-[280px] mt-0" placeholder="Filtrar por municipio ou descricao" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="thead text-left text-black/60">
            <tr>
              <th className="py-3 px-3">Municipio</th>
              <th className="py-3 px-3">Descricao</th>
              <th className="py-3 px-3">PDC sugerido</th>
              <th className="py-3 px-3">Status</th>
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
              rows.map((row) => {
                const m = relOne<{ municipio: string }>(row.municipalities);
                const t = relOne<{ pdc_codigo?: string | null; tipologia_codigo?: string | null }>(row.tipologia_sugerida);
                return (
                  <tr key={row.id} className="tr">
                    <td className="py-3 px-3">{m?.municipio || "-"}</td>
                    <td className="py-3 px-3">{row.descricao_problema}</td>
                    <td className="py-3 px-3">
                      {t?.pdc_codigo ? (
                        <span className="chip chip-primary">{t.pdc_codigo}</span>
                      ) : t?.tipologia_codigo ? (
                        <span className="chip">{t.tipologia_codigo}</span>
                      ) : (
                        <span className="text-black/50 text-sm">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">{row.status}</td>
                    <td className="py-3 px-3 text-right">
                      <button className="text-coral hover:underline" onClick={() => setDeleteId(row.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="tr">
                <td className="py-4 px-3 text-black/60" colSpan={5}>
                  Nenhuma demanda cadastrada.
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
      <DeleteConfirmModal open={Boolean(deleteId)} title="Eliminar demanda" onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
    </div>
  );
}

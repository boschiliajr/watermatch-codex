"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

export function DemandsTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabaseBrowser
      .from("demands")
      .select("id, descricao_problema, status, municipalities ( municipio ), tipologia_sugerida ( pdc_codigo, tipologia_codigo )");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete() {
    if (!deleteId) return;
    await supabaseBrowser.from("demands").delete().eq("id", deleteId);
    setDeleteId(null);
    load();
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Demandas</h4>
        {loading ? <span className="text-xs text-black/50">Carregando...</span> : null}
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="thead text-left text-black/60">
            <tr>
              <th className="py-3 px-3">Município</th>
              <th className="py-3 px-3">Descrição</th>
              <th className="py-3 px-3">PDC sugerido</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <tr key={idx} className="tr animate-pulse">
                  <td className="py-3 px-3">
                    <div className="h-3 w-28 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-64 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-20 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3">
                    <div className="h-3 w-16 rounded bg-black/10" />
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="h-3 w-8 rounded bg-black/10 ml-auto" />
                  </td>
                </tr>
              ))
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="tr">
                  <td className="py-3 px-3">{row.municipalities?.municipio || "-"}</td>
                  <td className="py-3 px-3">{row.descricao_problema}</td>
                  <td className="py-3 px-3">
                    {row.tipologia_sugerida?.pdc_codigo ? (
                      <span className="chip chip-primary">{row.tipologia_sugerida.pdc_codigo}</span>
                    ) : row.tipologia_sugerida?.tipologia_codigo ? (
                      <span className="chip">{row.tipologia_sugerida.tipologia_codigo}</span>
                    ) : (
                      <span className="text-black/50 text-sm">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {String(row.status || "").toLowerCase() === "matched" ? (
                      <span className="chip chip-good">Matched</span>
                    ) : String(row.status || "").toLowerCase() === "open" || String(row.status || "").toLowerCase() === "aberta" ? (
                      <span className="chip chip-primary">Aberta</span>
                    ) : (
                      <span className="chip">{row.status}</span>
                    )}
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
                  Nenhuma demanda cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <DeleteConfirmModal
        open={Boolean(deleteId)}
        title="Eliminar demanda"
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}

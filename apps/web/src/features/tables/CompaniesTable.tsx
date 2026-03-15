"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { apiClient } from "@/lib/apiClient";
import { CompanyTipologiasModal } from "@/features/companies/CompanyTipologiasModal";
import { useToast } from "@/components/Toast";

const PAGE_SIZE = 10;

export function CompaniesTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reviewCompany, setReviewCompany] = useState<{ id: string; name: string } | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabaseBrowser
      .from("companies")
      .select("id, cnpj, razao_social, municipio, uf, tags_produtos_servicos")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (query.trim()) q = q.or(`razao_social.ilike.%${query}%,municipio.ilike.%${query}%,cnpj.ilike.%${query}%`);

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
    await apiClient(`/api/companies/${deleteId}`, { method: "DELETE" });
    setDeleteId(null);
    load();
  }

  async function processPending() {
    setProcessing(true);
    try {
      const res = await apiClient<{ processed: number; completed: number; failed: number }>("/api/enrichment/run", {
        method: "POST",
        body: { limit: 10 }
      });
      toast.push({
        kind: "success",
        title: "Enriquecimento",
        message: `Processados: ${res.processed} | Concluidos: ${res.completed} | Falhas: ${res.failed}`
      });
      await load();
    } catch (error) {
      toast.push({ kind: "error", title: "Enriquecimento", message: (error as Error).message || "Falha ao processar enriquecimento." });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h4 className="font-semibold">Empresas</h4>
        <div className="flex items-center gap-2">
          <button className="btn" type="button" onClick={processPending} disabled={processing}>
            {processing ? "Processando..." : "Processar enriquecimento"}
          </button>
          <input className="input max-w-[280px] mt-0" placeholder="Filtrar por nome, CNPJ ou municipio" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead className="thead text-left text-black/60">
            <tr>
              <th className="py-3 px-3">CNPJ</th>
              <th className="py-3 px-3">Razao social</th>
              <th className="py-3 px-3">Municipio</th>
              <th className="py-3 px-3">Tags</th>
              <th className="py-3 px-3">Tipologias</th>
              <th className="py-3 px-3 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="tr">
                <td className="py-4 px-3 text-black/60" colSpan={6}>
                  Carregando...
                </td>
              </tr>
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
                  <td className="py-3 px-3">
                    <button className="btn" type="button" onClick={() => setReviewCompany({ id: row.id, name: row.razao_social })}>
                      Revisar
                    </button>
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
                <td className="py-4 px-3 text-black/60" colSpan={6}>
                  Nenhuma empresa cadastrada.
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
      <DeleteConfirmModal open={Boolean(deleteId)} title="Eliminar empresa" onCancel={() => setDeleteId(null)} onConfirm={handleDelete} />
      <CompanyTipologiasModal
        open={Boolean(reviewCompany)}
        companyId={reviewCompany?.id || null}
        companyName={reviewCompany?.name || ""}
        onClose={() => setReviewCompany(null)}
        onSaved={load}
      />
    </div>
  );
}

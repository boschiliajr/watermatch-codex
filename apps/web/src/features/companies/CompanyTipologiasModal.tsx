"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { apiClient } from "@/lib/apiClient";
import { useToast } from "@/components/Toast";

type TipologiaRow = {
  id: string;
  status: "suggested" | "approved" | "rejected";
  source: string;
  confidence: number;
  evidence?: { justification?: string; evidence?: string[] } | null;
  tipologia_id: string;
  fehidro_dictionary?: {
    id: string;
    tipologia_codigo: string;
    descricao_tipologia: string;
    pdc_codigo?: string | null;
    subpdc_codigo?: string | null;
  } | Array<{
    id: string;
    tipologia_codigo: string;
    descricao_tipologia: string;
    pdc_codigo?: string | null;
    subpdc_codigo?: string | null;
  }> | null;
};

type TipologiaCatalog = {
  id: string;
  tipologia_codigo: string;
  descricao_tipologia: string;
  pdc_codigo?: string | null;
  subpdc_codigo?: string | null;
};

type LatestJob = {
  id?: string;
  status?: string | null;
  error?: string | null;
  output_snapshot?: {
    used?: { opencnpj?: boolean; web?: boolean; llm?: boolean };
    services?: string[];
    suggestions?: Array<{
      tipologiaCodigo?: string;
      confidence?: number;
      justification?: string;
      source?: string;
      evidence?: string[];
    }>;
  } | null;
} | null;

function relOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export function CompanyTipologiasModal({
  open,
  companyId,
  companyName,
  onClose,
  onSaved
}: {
  open: boolean;
  companyId: string | null;
  companyName: string;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rows, setRows] = useState<TipologiaRow[]>([]);
  const [catalog, setCatalog] = useState<TipologiaCatalog[]>([]);
  const [latestJob, setLatestJob] = useState<LatestJob>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [approveSet, setApproveSet] = useState<Set<string>>(new Set());
  const [rejectSet, setRejectSet] = useState<Set<string>>(new Set());
  const [manualId, setManualId] = useState("");
  const [manualSet, setManualSet] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  async function loadData() {
    if (!companyId) return;
    setLoading(true);
    await apiClient<{ rows: TipologiaRow[]; catalog: TipologiaCatalog[]; latest_job: LatestJob; debug?: { enabled?: boolean } }>(
      `/api/companies/${companyId}/tipologias`
    )
      .then((data) => {
        setRows(data.rows || []);
        setCatalog(data.catalog || []);
        setLatestJob(data.latest_job || null);
        setDebugEnabled(Boolean(data.debug?.enabled));
        setApproveSet(new Set());
        setRejectSet(new Set());
        setManualSet(new Set());

        if (data.debug?.enabled) {
          const job = data.latest_job;
          const snap = job?.output_snapshot || {};
          console.group(`[enrichment-debug] company=${companyId}`);
          console.log("status", job?.status || null);
          console.log("error", job?.error || null);
          console.log("used", snap?.used || null);
          console.log("services", snap?.services || []);
          console.log("suggestions", snap?.suggestions || []);
          console.groupEnd();
        }
      })
      .catch((error) => {
        toast.push({ kind: "error", title: "Tipologias", message: (error as Error).message || "Falha ao carregar tipologias." });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!open || !companyId) return;
    loadData();
  }, [open, companyId, toast]);

  const filteredCatalog = useMemo(() => {
    if (!filter.trim()) return catalog.slice(0, 120);
    const q = filter.toLowerCase();
    return catalog.filter((x) => `${x.tipologia_codigo} ${x.descricao_tipologia}`.toLowerCase().includes(q)).slice(0, 120);
  }, [catalog, filter]);

  function toggleApprove(tipologiaId: string) {
    setApproveSet((prev) => {
      const next = new Set(prev);
      if (next.has(tipologiaId)) next.delete(tipologiaId);
      else next.add(tipologiaId);
      return next;
    });
    setRejectSet((prev) => {
      const next = new Set(prev);
      next.delete(tipologiaId);
      return next;
    });
  }

  function toggleReject(tipologiaId: string) {
    setRejectSet((prev) => {
      const next = new Set(prev);
      if (next.has(tipologiaId)) next.delete(tipologiaId);
      else next.add(tipologiaId);
      return next;
    });
    setApproveSet((prev) => {
      const next = new Set(prev);
      next.delete(tipologiaId);
      return next;
    });
  }

  async function saveReview() {
    if (!companyId) return;
    setSaving(true);
    try {
      await apiClient(`/api/companies/${companyId}/tipologias`, {
        method: "POST",
        body: {
          approve_tipologia_ids: [...approveSet],
          reject_tipologia_ids: [...rejectSet],
          manual_tipologia_ids: [...manualSet]
        }
      });
      toast.push({ kind: "success", title: "Tipologias", message: "Revisao salva com sucesso." });
      onSaved?.();
      onClose();
    } catch (error) {
      toast.push({ kind: "error", title: "Tipologias", message: (error as Error).message || "Falha ao salvar revisao." });
    } finally {
      setSaving(false);
    }
  }

  async function reprocessCompany() {
    if (!companyId) return;
    setProcessing(true);
    try {
      const res = await apiClient<{ processed: number; completed: number; failed: number }>("/api/enrichment/run", {
        method: "POST",
        body: {
          limit: 5,
          company_id: companyId
        }
      });
      toast.push({
        kind: "success",
        title: "Enriquecimento",
        message: `Processados: ${res.processed} | Concluidos: ${res.completed} | Falhas: ${res.failed}`
      });
      await loadData();
      onSaved?.();
    } catch (error) {
      toast.push({ kind: "error", title: "Enriquecimento", message: (error as Error).message || "Falha ao reprocessar empresa." });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <Modal open={open} title={`Revisar Tipologias - ${companyName || "Empresa"}`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-black/70">
          Status do enriquecimento: <span className="font-semibold">{latestJob?.status || "sem job"}</span>
        </p>
        <div>
          <button type="button" className="btn" onClick={reprocessCompany} disabled={processing}>
            {processing ? "Reprocessando..." : "Reprocessar esta empresa"}
          </button>
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold mb-2">Adicionar tipologia manual</p>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <input className="input mt-0" placeholder="Filtrar tipologia..." value={filter} onChange={(e) => setFilter(e.target.value)} />
            <button
              type="button"
              className="btn"
              onClick={() => {
                if (!manualId) return;
                setManualSet((prev) => new Set(prev).add(manualId));
              }}
            >
              Adicionar
            </button>
          </div>
          <select className="input mt-2" value={manualId} onChange={(e) => setManualId(e.target.value)}>
            <option value="">Selecione...</option>
            {filteredCatalog.map((c) => (
              <option key={c.id} value={c.id}>
                {c.tipologia_codigo} - {c.descricao_tipologia}
              </option>
            ))}
          </select>
          {manualSet.size ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {[...manualSet].map((id) => {
                const found = catalog.find((c) => c.id === id);
                return (
                  <span key={id} className="chip chip-primary">
                    {found?.tipologia_codigo || id}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm font-semibold mb-2">Sugestoes ({rows.length})</p>
          {!loading && rows.length === 0 ? (
            <p className="text-xs text-black/60 mb-2">
              LLM/fallback nao encontrou correspondencia suficiente para sugerir tipologias nesta execucao.
              {debugEnabled ? " Verifique o console do navegador para diagnostico detalhado." : ""}
            </p>
          ) : null}
          {loading ? (
            <p className="text-sm text-black/60">Carregando...</p>
          ) : rows.length ? (
            <div className="max-h-[320px] overflow-auto grid gap-2">
              {rows.map((row) => {
                const tip = relOne(row.fehidro_dictionary);
                return (
                  <div key={row.id} className="rounded-lg border p-2 text-sm" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{tip?.tipologia_codigo || "Tipologia"}</p>
                      <span className="text-xs text-black/60">conf: {Number(row.confidence || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-black/70 mt-1">{tip?.descricao_tipologia || "-"}</p>
                    <p className="text-xs text-black/60 mt-1">status atual: {row.status}</p>
                    {row.evidence?.justification ? <p className="text-xs text-black/60 mt-1">{row.evidence.justification}</p> : null}
                    <div className="flex gap-2 mt-2">
                      <button type="button" className={approveSet.has(row.tipologia_id) ? "btn-primary" : "btn"} onClick={() => toggleApprove(row.tipologia_id)}>
                        Aprovar
                      </button>
                      <button type="button" className={rejectSet.has(row.tipologia_id) ? "btn-primary" : "btn"} onClick={() => toggleReject(row.tipologia_id)}>
                        Rejeitar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-black/60">Sem sugestoes no momento.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" disabled={saving} onClick={saveReview}>
            {saving ? "Salvando..." : "Salvar revisao"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

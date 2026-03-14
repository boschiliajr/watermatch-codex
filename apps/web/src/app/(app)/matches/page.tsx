"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useToast } from "@/components/Toast";

type MatchRow = {
  id: string;
  score_compatibilidade: number;
  demands?: { descricao_problema: string; municipalities?: { municipio: string } | null } | Array<{ descricao_problema: string; municipalities?: { municipio: string } | null }> | null;
  companies?: { razao_social: string; tags_produtos_servicos: string[] | null } | Array<{ razao_social: string; tags_produtos_servicos: string[] | null }> | null;
};

function relOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function pct(score: number) {
  if (!Number.isFinite(score)) return 0;
  const v = score <= 1 ? score * 100 : score;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export default function MatchesPage() {
  const toast = useToast();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from("matches")
      .select("id, score_compatibilidade, demands ( descricao_problema, municipalities ( municipio ) ), companies ( razao_social, tags_produtos_servicos )")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      toast.push({ kind: "error", title: "Matches", message: error.message });
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as any) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function run() {
    setRunning(true);
    try {
      const res = await fetch("/api/matchmaking/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.push({ kind: "error", title: "Matchmaking", message: String(data?.error || "Falha ao rodar matchmaking.") });
        return;
      }
      toast.push({ kind: "success", title: "Matchmaking", message: `Matches inseridos/atualizados: ${data?.inserted ?? 0}` });
      await load();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="page-title">Matches</h2>
            <p className="page-subtitle">{loading ? "Carregando..." : `${rows.length} matches encontrados`}</p>
          </div>
          <button className="btn-primary" type="button" onClick={run} disabled={running}>
            {running ? "Rodando..." : "Rodar matchmaking"}
          </button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 w-40 bg-black/10 rounded" />
              <div className="mt-3 h-3 w-56 bg-black/10 rounded" />
              <div className="mt-3 h-3 w-44 bg-black/10 rounded" />
            </div>
          ))
        ) : rows.length ? (
          rows.map((m) => {
            const c = relOne(m.companies);
            const d = relOne(m.demands);
            const company = c?.razao_social || "Empresa";
            const municipio = d?.municipalities?.municipio || "Municipio";
            const desc = d?.descricao_problema || "";
            const tags = c?.tags_produtos_servicos || [];
            const p = pct(m.score_compatibilidade);
            return (
              <div key={m.id} className="card p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{company}</p>
                    <p className="text-xs text-black/60 truncate">Demanda - {municipio}</p>
                  </div>
                  <span className={p >= 80 ? "chip chip-good" : p >= 50 ? "chip chip-warn" : "chip"}>
                    Match {p}%
                  </span>
                </div>
                <p className="text-sm text-black/80 line-clamp-3">{desc}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.slice(0, 4).map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="card p-6 text-sm text-black/60">Nenhum match ainda. Rode o matchmaking para gerar.</div>
        )}
      </section>
    </div>
  );
}

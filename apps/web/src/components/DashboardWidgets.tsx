import { supabaseServer } from "@/lib/supabaseServer";

function formatBRL(value: number) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

function relOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function DashboardWidgets() {
  const [{ data: demands }, { data: projects }] = await Promise.all([
    supabaseServer
      .from("demands")
      .select("id, tipologia_sugerida ( pdc_codigo )")
      .in("status", ["open", "aberta", "matched"]),
    supabaseServer.from("projects").select("valor_total_fehidro")
  ]);

  const pdcCounts = new Map<string, number>();
  for (const d of (demands || []) as any[]) {
    const tip = relOne<{ pdc_codigo?: string | null }>(d?.tipologia_sugerida);
    const pdc = tip?.pdc_codigo || "Sem PDC";
    pdcCounts.set(pdc, (pdcCounts.get(pdc) || 0) + 1);
  }

  const pdcRows = Array.from(pdcCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const max = Math.max(1, ...pdcRows.map((r) => r[1]));

  const totalProjetos = (projects || []).reduce((acc: number, p: any) => acc + (Number(p?.valor_total_fehidro) || 0), 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="kicker">Analise</p>
            <h3 className="text-lg font-semibold">Demandas por PDC</h3>
            <p className="text-sm text-black/60">Top PDCs com mais demanda.</p>
          </div>
        </div>

        <div className="grid gap-3">
          {pdcRows.length ? (
            pdcRows.map(([pdc, count]) => (
              <div key={pdc} className="grid grid-cols-[140px_1fr_40px] items-center gap-3">
                <div className="text-sm text-black/70 truncate">{pdc}</div>
                <div className="h-3 rounded-full bg-black/10 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((count / max) * 100)}%`,
                      background: "linear-gradient(90deg, var(--primary), rgba(11, 91, 122, 0.55))"
                    }}
                  />
                </div>
                <div className="text-sm text-black/70 text-right">{count}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-black/60">Sem dados ainda.</p>
          )}
        </div>
      </div>

      <div className="card p-6 flex flex-col justify-between">
        <div>
          <p className="kicker">KPI</p>
          <h3 className="text-lg font-semibold">Valor em Projetos</h3>
          <p className="text-sm text-black/60">Soma do valor total FEHIDRO (protótipo).</p>
        </div>
        <div className="mt-8">
          <p className="text-3xl font-semibold" style={{ color: "var(--primary)" }}>
            {formatBRL(totalProjetos)}
          </p>
          <p className="text-xs text-black/50 mt-2">Atualizado em tempo real</p>
        </div>
      </div>
    </div>
  );
}

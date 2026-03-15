import { resolveBasinsByMunicipio } from "@/lib/bacias";

type DemandRow = {
  id: string;
  status: string;
  descricao_problema: string;
  tipologia_sugerida: { tipologia_codigo?: string | null } | Array<{ tipologia_codigo?: string | null }> | null;
  municipalities?: { municipio: string; uf: string; bacias_hidrograficas?: string[] | null } | Array<{ municipio: string; uf: string; bacias_hidrograficas?: string[] | null }> | null;
};

type CompanyRow = {
  id: string;
  municipio: string;
  uf: string;
  tags_produtos_servicos: string[] | null;
};

function relOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function tokens(text: string) {
  return new Set(
    normalize(text)
      .split(/[^a-z0-9]+/g)
      .filter((x) => x.length >= 3)
  );
}

function basinCodesForCompany(company: CompanyRow): string[] {
  const resolved = resolveBasinsByMunicipio({ uf: company.uf, municipio: company.municipio });
  return resolved.bacias.map((b) => b.code);
}

export function scoreMatch(params: {
  tipologiaCodigo: string | null;
  companyTags: string[];
  demandDescription: string;
  demandBasins: string[];
  companyBasins: string[];
  demandStatus: string;
}) {
  const tagsNorm = params.companyTags.map(normalize);
  const tip = normalize(params.tipologiaCodigo || "");
  const tagExact = tip && tagsNorm.some((t) => t === tip) ? 1 : 0;

  const demandTokens = tokens(params.demandDescription);
  const overlap = tagsNorm.filter((t) => demandTokens.has(normalize(t))).length;
  const overlapScore = Math.min(1, overlap / 3);

  const basinMatch =
    params.demandBasins.length && params.companyBasins.length
      ? params.demandBasins.some((b) => params.companyBasins.includes(b))
        ? 1
        : 0
      : 0;

  const statusWeight = normalize(params.demandStatus) === "open" || normalize(params.demandStatus) === "aberta" ? 1 : 0.4;

  const raw = (tagExact * 0.6 + overlapScore * 0.25 + basinMatch * 0.15) * statusWeight;
  return Math.round(Math.max(0, Math.min(100, raw * 100)));
}

export async function runMatchmaking() {
  const { supabaseServer } = await import("./supabaseServer");

  const { data: demands, error: demandsError } = await supabaseServer
    .from("demands")
    .select("id, status, descricao_problema, tipologia_sugerida ( tipologia_codigo ), municipalities ( municipio, uf, bacias_hidrograficas )")
    .in("status", ["open", "aberta", "matched"]);

  if (demandsError) throw new Error(demandsError.message);

  const { data: companies, error: companiesError } = await supabaseServer.from("companies").select("id, municipio, uf, tags_produtos_servicos");
  if (companiesError) throw new Error(companiesError.message);

  const { data: currentMatches, error: currentError } = await supabaseServer.from("matches").select("demand_id, company_id, score_compatibilidade");
  if (currentError) throw new Error(currentError.message);

  const existing = new Map<string, number>();
  for (const m of currentMatches || []) existing.set(`${(m as any).demand_id}:${(m as any).company_id}`, Number((m as any).score_compatibilidade || 0));

  const upserts: Array<{ demand_id: string; company_id: string; score_compatibilidade: number }> = [];
  let ignored = 0;
  let errors = 0;

  for (const demand of (demands || []) as DemandRow[]) {
    const tip = relOne<{ tipologia_codigo?: string | null }>(demand.tipologia_sugerida)?.tipologia_codigo ?? null;
    const mun = relOne<{ municipio: string; uf: string; bacias_hidrograficas?: string[] | null }>(demand.municipalities);
    const demandBasins = (mun?.bacias_hidrograficas || []).map((b) => String(b));

    for (const company of (companies || []) as CompanyRow[]) {
      try {
        const score = scoreMatch({
          tipologiaCodigo: tip,
          companyTags: company.tags_produtos_servicos || [],
          demandDescription: demand.descricao_problema,
          demandBasins,
          companyBasins: basinCodesForCompany(company),
          demandStatus: demand.status
        });
        if (score < 25) {
          ignored += 1;
          continue;
        }
        upserts.push({ demand_id: demand.id, company_id: company.id, score_compatibilidade: score });
      } catch {
        errors += 1;
      }
    }
  }

  if (upserts.length === 0) {
    return { inserted: 0, updated: 0, ignored, errors, processed: 0 };
  }

  const { error: insertError } = await supabaseServer.from("matches").upsert(upserts, { onConflict: "demand_id,company_id" });
  if (insertError) throw new Error(insertError.message);

  let inserted = 0;
  let updated = 0;
  for (const row of upserts) {
    const key = `${row.demand_id}:${row.company_id}`;
    if (!existing.has(key)) {
      inserted += 1;
      continue;
    }
    if (existing.get(key) !== row.score_compatibilidade) updated += 1;
  }

  return { inserted, updated, ignored, errors, processed: upserts.length };
}

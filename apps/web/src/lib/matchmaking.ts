import { supabaseServer } from "./supabaseServer";

type DemandRow = {
  id: string;
  status: string;
  tipologia_sugerida: { id: string; tipologia_codigo: string } | null;
};

type CompanyRow = {
  id: string;
  tags_produtos_servicos: string[] | null;
};

export async function runMatchmaking() {
  const { data: demands, error: demandsError } = await supabaseServer
    .from("demands")
    .select("id, status, tipologia_sugerida ( id, tipologia_codigo )")
    .in("status", ["open", "aberta"]);

  if (demandsError) {
    throw new Error(demandsError.message);
  }

  const { data: companies, error: companiesError } = await supabaseServer
    .from("companies")
    .select("id, tags_produtos_servicos");

  if (companiesError) {
    throw new Error(companiesError.message);
  }

  const matchesToInsert = [] as Array<{ demand_id: string; company_id: string; score_compatibilidade: number }>;

  for (const demand of (demands || []) as DemandRow[]) {
    const tipologia = demand.tipologia_sugerida?.tipologia_codigo;
    if (!tipologia) continue;

    for (const company of (companies || []) as CompanyRow[]) {
      const tags = company.tags_produtos_servicos || [];
      const hasMatch = tags.some((tag) => tag.toLowerCase() === tipologia.toLowerCase());

      if (hasMatch) {
        matchesToInsert.push({
          demand_id: demand.id,
          company_id: company.id,
          score_compatibilidade: 1
        });
      }
    }
  }

  if (matchesToInsert.length === 0) {
    return { inserted: 0 };
  }

  const { error: insertError } = await supabaseServer
    .from("matches")
    .upsert(matchesToInsert, { onConflict: "demand_id,company_id" });

  if (insertError) {
    throw new Error(insertError.message);
  }

  return { inserted: matchesToInsert.length };
}

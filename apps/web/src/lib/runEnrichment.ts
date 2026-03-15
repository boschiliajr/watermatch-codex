import { supabaseServer } from "@/lib/supabaseServer";
import { enrichCompanyForTipologias, shouldAutoApproveSuggestion, summarizeEvidence } from "@/lib/companyEnrichment";

type JobRow = {
  id: string;
  company_id: string;
  attempts: number;
  input_snapshot: Record<string, unknown>;
};

export async function runEnrichmentJobs(params: { limit?: number; companyId?: string | null }) {
  const limit = Math.max(1, Math.min(20, Number(params.limit || 5)));

  let jobsQuery = supabaseServer
    .from("company_enrichment_jobs")
    .select("id, company_id, attempts, input_snapshot")
    .in("status", ["pending", "failed"])
    .lt("attempts", 3)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (params.companyId) {
    jobsQuery = jobsQuery.eq("company_id", params.companyId);
  }

  const { data: jobs, error: jobsError } = await jobsQuery;
  if (jobsError) throw new Error(jobsError.message);

  let completed = 0;
  let failed = 0;

  for (const job of (jobs || []) as JobRow[]) {
    const { error: lockError } = await supabaseServer
      .from("company_enrichment_jobs")
      .update({ status: "processing", attempts: Number(job.attempts || 0) + 1, updated_at: new Date().toISOString(), error: null })
      .eq("id", job.id);
    if (lockError) {
      failed += 1;
      continue;
    }

    try {
      const { data: company, error: companyError } = await supabaseServer
        .from("companies")
        .select("id, cnpj, razao_social, municipio, uf, tags_produtos_servicos")
        .eq("id", job.company_id)
        .limit(1)
        .maybeSingle();
      if (companyError) throw new Error(companyError.message);
      if (!company) throw new Error("Empresa nao encontrada para job.");

      const enriched = await enrichCompanyForTipologias({
        cnpj: String((company as any).cnpj || ""),
        razao_social: String((company as any).razao_social || ""),
        municipio: String((company as any).municipio || ""),
        uf: String((company as any).uf || ""),
        existingTags: ((company as any).tags_produtos_servicos || []) as string[]
      });

      const codes = enriched.suggestions.map((x) => x.tipologiaCodigo);
      const { data: dictRows, error: dictError } = await supabaseServer
        .from("fehidro_dictionary")
        .select("id, tipologia_codigo")
        .in("tipologia_codigo", codes);
      if (dictError) throw new Error(dictError.message);
      const byCode = new Map<string, string>();
      for (const row of dictRows || []) byCode.set(String((row as any).tipologia_codigo), String((row as any).id));

      const upserts = enriched.suggestions
        .filter((x) => byCode.has(x.tipologiaCodigo))
        .map((s) => ({
          company_id: String((company as any).id),
          tipologia_id: byCode.get(s.tipologiaCodigo) as string,
          status: shouldAutoApproveSuggestion(s.confidence) ? "approved" : "suggested",
          source: s.source,
          confidence: s.confidence,
          evidence: {
            justification: s.justification,
            evidence: summarizeEvidence(s.evidence),
            used: enriched.used
          }
        }));
      if (upserts.length) {
        const { error: upsertError } = await supabaseServer.from("company_tipologias").upsert(upserts, { onConflict: "company_id,tipologia_id" });
        if (upsertError) throw new Error(upsertError.message);
      }

      const { error: doneError } = await supabaseServer
        .from("company_enrichment_jobs")
        .update({
          status: "completed",
          output_snapshot: {
            used: enriched.used,
            services: enriched.services.slice(0, 20),
            suggestions: enriched.suggestions.slice(0, 20)
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id);
      if (doneError) throw new Error(doneError.message);
      completed += 1;
    } catch (error) {
      const { error: failError } = await supabaseServer
        .from("company_enrichment_jobs")
        .update({
          status: "failed",
          error: String((error as Error)?.message || error),
          updated_at: new Date().toISOString()
        })
        .eq("id", job.id);
      if (failError) failed += 1;
      else failed += 1;
    }
  }

  return {
    ok: true,
    processed: (jobs || []).length,
    completed,
    failed
  };
}

import { z } from "zod";
import { apiError, apiOk, parseAndValidate } from "@/lib/api";
import { runEnrichmentJobs } from "@/lib/runEnrichment";
import { supabaseServer } from "@/lib/supabaseServer";
import { enqueueCompanyEnrichment } from "@/lib/companyEnrichmentJobs";

const schema = z.object({
  limit: z.number().int().min(1).max(20).optional(),
  company_id: z.string().uuid().optional()
});

export async function POST(req: Request) {
  const parsed = await parseAndValidate(req, schema);
  if (!parsed.ok) return parsed.error;

  try {
    const companyId = parsed.data.company_id ?? null;
    let result = await runEnrichmentJobs({
      limit: parsed.data.limit ?? 5,
      companyId
    });

    if (companyId && result.processed === 0) {
      const { count, error: countError } = await supabaseServer
        .from("company_enrichment_jobs")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId);
      if (countError) return apiError("DB_ERROR", countError.message, 400);

      if ((count ?? 0) === 0) {
        const { data: company, error: companyError } = await supabaseServer
          .from("companies")
          .select("id, cnpj, razao_social, municipio, uf, tags_produtos_servicos")
          .eq("id", companyId)
          .limit(1)
          .maybeSingle();
        if (companyError) return apiError("DB_ERROR", companyError.message, 400);
        if (!company) return apiError("NOT_FOUND", "Empresa nao encontrada.", 404);

        await enqueueCompanyEnrichment({
          companyId: String((company as any).id),
          input: {
            cnpj: (company as any).cnpj,
            razao_social: (company as any).razao_social,
            municipio: (company as any).municipio,
            uf: (company as any).uf,
            tags_produtos_servicos: (company as any).tags_produtos_servicos || []
          }
        });

        result = await runEnrichmentJobs({
          limit: parsed.data.limit ?? 5,
          companyId
        });
      }
    }

    return apiOk(result);
  } catch (error) {
    return apiError("ENRICHMENT_FAILED", "Falha ao executar enriquecimento.", 500, String((error as Error)?.message || error));
  }
}

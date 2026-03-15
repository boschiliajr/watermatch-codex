import { apiError, apiOk } from "@/lib/api";
import { runEnrichmentJobs } from "@/lib/runEnrichment";

function isAuthorized(req: Request) {
  const secret = process.env.INTERNAL_ENRICHMENT_SECRET;
  if (!secret) return false;
  const token = req.headers.get("x-internal-token") || "";
  return token && token === secret;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return apiError("UNAUTHORIZED", "Nao autorizado.", 401);

  const body = await req.json().catch(() => ({}));
  try {
    const result = await runEnrichmentJobs({
      limit: Number((body as any)?.limit || 5),
      companyId: (body as any)?.company_id ? String((body as any).company_id) : null
    });
    return apiOk(result);
  } catch (error) {
    return apiError("ENRICHMENT_FAILED", "Falha ao executar enriquecimento.", 500, String((error as Error)?.message || error));
  }
}

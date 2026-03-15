import { z } from "zod";
import { apiError, apiOk, parseAndValidate } from "@/lib/api";
import { supabaseServer } from "@/lib/supabaseServer";

const reviewSchema = z.object({
  approve_tipologia_ids: z.array(z.string().uuid()).default([]),
  reject_tipologia_ids: z.array(z.string().uuid()).default([]),
  manual_tipologia_ids: z.array(z.string().uuid()).default([])
});

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const companyId = String(ctx?.params?.id || "");
  if (!companyId) return apiError("VALIDATION_ERROR", "ID obrigatorio.", 400);

  const [{ data: rows, error }, { data: jobs, error: jobsError }, { data: catalog, error: catalogError }] = await Promise.all([
    supabaseServer
      .from("company_tipologias")
      .select("id, status, source, confidence, evidence, tipologia_id, created_at, updated_at, fehidro_dictionary ( id, tipologia_codigo, descricao_tipologia, pdc_codigo, subpdc_codigo )")
      .eq("company_id", companyId)
      .order("confidence", { ascending: false }),
    supabaseServer
      .from("company_enrichment_jobs")
      .select("id, status, error, output_snapshot, created_at, updated_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(1),
    supabaseServer
      .from("fehidro_dictionary")
      .select("id, tipologia_codigo, descricao_tipologia, pdc_codigo, subpdc_codigo")
      .order("tipologia_codigo", { ascending: true })
  ]);

  if (error) return apiError("DB_ERROR", error.message, 400);
  if (jobsError) return apiError("DB_ERROR", jobsError.message, 400);
  if (catalogError) return apiError("DB_ERROR", catalogError.message, 400);

  const appEnv = String(process.env.APP_ENV || "local").toLowerCase();
  const debugFlag = ["1", "true", "yes", "on"].includes(String(process.env.NEXT_PUBLIC_ENRICHMENT_DEBUG || "0").toLowerCase());
  const debugEnabled = debugFlag && appEnv !== "production";

  return apiOk({
    rows: rows || [],
    latest_job: (jobs || [])[0] || null,
    catalog: catalog || [],
    ...(debugEnabled
      ? {
          debug: {
            enabled: true,
            app_env: appEnv
          }
        }
      : {})
  });
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const companyId = String(ctx?.params?.id || "");
  if (!companyId) return apiError("VALIDATION_ERROR", "ID obrigatorio.", 400);
  const parsed = await parseAndValidate(req, reviewSchema);
  if (!parsed.ok) return parsed.error;

  const approve = parsed.data.approve_tipologia_ids || [];
  const reject = parsed.data.reject_tipologia_ids || [];
  const manual = parsed.data.manual_tipologia_ids || [];

  if (approve.length) {
    const { data: existing, error: existingError } = await supabaseServer
      .from("company_tipologias")
      .select("tipologia_id")
      .eq("company_id", companyId)
      .in("tipologia_id", approve);
    if (existingError) return apiError("DB_ERROR", existingError.message, 400);

    const existingIds = new Set((existing || []).map((x: any) => String(x.tipologia_id)));
    const upsertRows = approve.map((tipologiaId) => ({
      company_id: companyId,
      tipologia_id: tipologiaId,
      status: "approved",
      source: existingIds.has(tipologiaId) ? "hybrid" : "manual",
      confidence: existingIds.has(tipologiaId) ? 0.9 : 1,
      evidence: { reviewed: true }
    }));
    const { error } = await supabaseServer.from("company_tipologias").upsert(upsertRows, { onConflict: "company_id,tipologia_id" });
    if (error) return apiError("DB_ERROR", error.message, 400);
  }

  if (reject.length) {
    const rows = reject.map((tipologiaId) => ({
      company_id: companyId,
      tipologia_id: tipologiaId,
      status: "rejected",
      source: "manual",
      confidence: 0,
      evidence: { reviewed: true }
    }));
    const { error } = await supabaseServer.from("company_tipologias").upsert(rows, { onConflict: "company_id,tipologia_id" });
    if (error) return apiError("DB_ERROR", error.message, 400);
  }

  if (manual.length) {
    const rows = manual.map((tipologiaId) => ({
      company_id: companyId,
      tipologia_id: tipologiaId,
      status: "approved",
      source: "manual",
      confidence: 1,
      evidence: { manual_add: true }
    }));
    const { error } = await supabaseServer.from("company_tipologias").upsert(rows, { onConflict: "company_id,tipologia_id" });
    if (error) return apiError("DB_ERROR", error.message, 400);
  }

  return apiOk({ ok: true });
}

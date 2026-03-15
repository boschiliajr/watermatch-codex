import { apiError, apiOk, parseAndValidate } from "@/lib/api";
import { createDemandSchema } from "@/lib/schemas";
import { supabaseServer } from "@/lib/supabaseServer";
import { suggestTipologia } from "@watertech/shared";

export async function POST(req: Request) {
  const parsed = await parseAndValidate(req, createDemandSchema);
  if (!parsed.ok) return parsed.error;

  const suggestion = suggestTipologia(parsed.data.descricao_problema);
  let tipologiaId: string | null = null;
  if (suggestion?.tipologiaCodigo) {
    const { data } = await supabaseServer
      .from("fehidro_dictionary")
      .select("id")
      .eq("tipologia_codigo", suggestion.tipologiaCodigo)
      .limit(1)
      .maybeSingle();
    tipologiaId = (data as any)?.id ?? null;
  }

  const { error } = await supabaseServer.from("demands").insert({
    municipality_id: parsed.data.municipality_id,
    descricao_problema: parsed.data.descricao_problema,
    tipologia_sugerida: tipologiaId,
    status: parsed.data.status
  });

  if (error) return apiError("DB_ERROR", error.message, 400);
  return apiOk({ ok: true, tipologia_sugerida: suggestion?.tipologiaCodigo ?? null });
}


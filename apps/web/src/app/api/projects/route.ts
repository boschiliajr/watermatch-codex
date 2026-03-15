import { apiError, apiOk, parseAndValidate } from "@/lib/api";
import { createProjectSchema } from "@/lib/schemas";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const parsed = await parseAndValidate(req, createProjectSchema);
  if (!parsed.ok) return parsed.error;

  const { error } = await supabaseServer.from("projects").insert({
    match_id: parsed.data.match_id,
    titulo: parsed.data.titulo,
    resumo: parsed.data.resumo ?? null,
    valor_custo_empresa: parsed.data.valor_custo_empresa,
    margem_pit_percentual: parsed.data.margem_pit_percentual
  });

  if (error) return apiError("DB_ERROR", error.message, 400);
  return apiOk({ ok: true });
}


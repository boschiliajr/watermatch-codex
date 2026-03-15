import { apiError, apiOk } from "@/lib/api";
import { supabaseServer } from "@/lib/supabaseServer";

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  if (!ctx.params.id) return apiError("VALIDATION_ERROR", "ID obrigatorio.", 400);

  const { error } = await supabaseServer.from("projects").delete().eq("id", ctx.params.id);
  if (error) return apiError("DB_ERROR", error.message, 400);
  return apiOk({ ok: true });
}


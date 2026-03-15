import { apiError, apiOk } from "@/lib/api";
import { deleteInstitution } from "@/lib/institutionsService";

export async function DELETE(req: Request, ctx: { params: { kind: string; id: string } }) {
  const { kind, id } = ctx.params;
  if (!id) return apiError("VALIDATION_ERROR", "ID obrigatorio.", 400);

  const result = await deleteInstitution(kind, id);
  if (!result.ok) return apiError(result.code, result.message, result.status);
  return apiOk({ ok: true });
}


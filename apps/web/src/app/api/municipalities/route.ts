import { z } from "zod";

import { apiError, apiOk, parseAndValidate } from "@/lib/api";
import { createMunicipalitySchema } from "@/lib/schemas";
import { createInstitution } from "@/lib/institutionsService";

const schema = createMunicipalitySchema.extend({
  allow_mock: z.boolean().optional()
});

export async function POST(req: Request) {
  const parsed = await parseAndValidate(req, schema);
  if (!parsed.ok) return parsed.error;

  const result = await createInstitution({ kind: "municipality", ...parsed.data });
  if (!result.ok) return apiError(result.code, result.message, result.status, result.details);
  return apiOk({ ok: true, source: result.source });
}


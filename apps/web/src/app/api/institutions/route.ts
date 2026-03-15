import { z } from "zod";

import { apiError, apiOk, parseAndValidate } from "@/lib/api";
import { createCompanySchema, createMunicipalitySchema } from "@/lib/schemas";
import { createInstitution } from "@/lib/institutionsService";

const payloadSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("company"),
    allow_mock: z.boolean().optional(),
    ...createCompanySchema.shape
  }),
  z.object({
    kind: z.literal("municipality"),
    allow_mock: z.boolean().optional(),
    ...createMunicipalitySchema.shape
  })
]);

export async function POST(req: Request) {
  const parsed = await parseAndValidate(req, payloadSchema);
  if (!parsed.ok) return parsed.error;

  const result = await createInstitution(parsed.data);
  if (!result.ok) return apiError(result.code, result.message, result.status, result.details);

  return apiOk({
    ok: true,
    source: result.source,
    company_id: "companyId" in result ? result.companyId : null,
    enrichment_job_id: "enrichmentJobId" in result ? result.enrichmentJobId : null,
    enrichment_status: "enrichmentStatus" in result ? result.enrichmentStatus : null
  });
}


import { apiError, apiOk } from "@/lib/api";

import { lookupCnpj } from "@/lib/cnpjLookup";
import { detectInstitutionKind } from "@/lib/institutionKind";
import { resolveBasinsByMunicipio } from "@/lib/bacias";

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return apiError("INVALID_JSON", "Corpo da requisicao invalido.", 400);
  }

  const cnpj = String(body?.cnpj || "");
  if (!cnpj) {
    return apiError("VALIDATION_ERROR", "CNPJ obrigatorio.", 400);
  }

  const { result, source } = await lookupCnpj(cnpj);
  const detected = detectInstitutionKind(result);

  const basinsResolved =
    detected.kind === "municipality"
      ? resolveBasinsByMunicipio({ uf: result.uf, municipio: result.municipio })
      : { bacias: [], municipio_norm: "", source: "internal", updated_at: "" };

  return apiOk({
    ...result,
    source,
    source_reliability: source === "opencnpj" ? "high" : "low",
    requires_manual_confirmation: source === "mock",
    kind: detected.kind,
    kind_confidence: detected.confidence,
    kind_reason: detected.reason,
    bacias_hidrograficas: basinsResolved.bacias
  });
}


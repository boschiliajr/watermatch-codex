import { NextRequest, NextResponse } from "next/server";

import { lookupCnpj } from "@/lib/cnpjLookup";
import { detectInstitutionKind } from "@/lib/institutionKind";
import { resolveBasinsByMunicipio } from "@/lib/bacias";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cnpj = String(body?.cnpj || "");

  if (!cnpj) {
    return NextResponse.json({ error: "CNPJ obrigatório" }, { status: 400 });
  }

  const { result, source } = await lookupCnpj(cnpj);
  const detected = detectInstitutionKind(result);

  const basinsResolved =
    detected.kind === "municipality"
      ? resolveBasinsByMunicipio({ uf: result.uf, municipio: result.municipio })
      : { bacias: [], municipio_norm: "", source: "internal", updated_at: "" };

  return NextResponse.json({
    ...result,
    source,
    kind: detected.kind,
    kind_confidence: detected.confidence,
    kind_reason: detected.reason,
    bacias_hidrograficas: basinsResolved.bacias
  });
}

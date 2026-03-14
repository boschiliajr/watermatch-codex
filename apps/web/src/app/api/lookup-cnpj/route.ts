import { NextRequest, NextResponse } from "next/server";

import { lookupCnpj } from "@/lib/cnpjLookup";
import { detectInstitutionKind } from "@/lib/institutionKind";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cnpj = String(body?.cnpj || "");

  if (!cnpj) {
    return NextResponse.json({ error: "CNPJ obrigatório" }, { status: 400 });
  }

  const { result, source } = await lookupCnpj(cnpj);
  const detected = detectInstitutionKind(result);

  return NextResponse.json({
    ...result,
    source,
    kind: detected.kind,
    kind_confidence: detected.confidence,
    kind_reason: detected.reason
  });
}


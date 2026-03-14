import { NextRequest, NextResponse } from "next/server";
import { resolveBasinsByMunicipio } from "@/lib/bacias";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const uf = String(searchParams.get("uf") || "");
  const municipio = String(searchParams.get("municipio") || "");

  if (!uf || !municipio) {
    return NextResponse.json({ error: "uf e municipio são obrigatórios." }, { status: 400 });
  }

  const resolved = resolveBasinsByMunicipio({ uf, municipio });
  return NextResponse.json(resolved);
}


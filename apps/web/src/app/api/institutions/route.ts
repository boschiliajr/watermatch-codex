import { NextRequest, NextResponse } from "next/server";

import { lookupCnpj } from "@/lib/cnpjLookup";
import { detectInstitutionKind, type InstitutionKind } from "@/lib/institutionKind";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveBasinsByMunicipio } from "@/lib/bacias";

function cleanCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, "");
}

function kindToTable(kind: InstitutionKind) {
  if (kind === "company") return "companies";
  if (kind === "municipality") return "municipalities";
  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const requestedKind = String(body?.kind || "") as InstitutionKind;
  const cnpjInput = String(body?.cnpj || "");
  const cnpj = cleanCnpj(cnpjInput);

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido (precisa ter 14 dígitos)." }, { status: 400 });
  }

  if (requestedKind !== "company" && requestedKind !== "municipality") {
    return NextResponse.json({ error: "Tipo inválido. Use company ou municipality." }, { status: 400 });
  }

  const { result } = await lookupCnpj(cnpj);
  const detected = detectInstitutionKind(result);

  if (detected.kind === "unknown") {
    return NextResponse.json(
      { error: "Não foi possível determinar o tipo da instituição para este CNPJ.", kind: detected.kind, reason: detected.reason },
      { status: 422 }
    );
  }

  if (detected.kind === "government_other") {
    return NextResponse.json(
      {
        error:
          "Este CNPJ parece ser de um órgão público que não é prefeitura/município. Por enquanto, o sistema bloqueia este cadastro.",
        kind: detected.kind,
        reason: detected.reason
      },
      { status: 422 }
    );
  }

  if (detected.kind !== requestedKind) {
    return NextResponse.json(
      {
        error:
          detected.kind === "municipality"
            ? "Este CNPJ parece ser de uma prefeitura. Cadastre como Prefeitura."
            : "Este CNPJ parece ser de uma empresa. Cadastre como Empresa.",
        kind: detected.kind,
        reason: detected.reason
      },
      { status: 422 }
    );
  }

  // Prevent the same CNPJ from living in both tables.
  const otherTable = detected.kind === "company" ? "municipalities" : "companies";
  const { data: existingOther, error: otherErr } = await supabaseServer
    .from(otherTable)
    .select("id")
    .eq("cnpj", cnpj)
    .limit(1);
  if (otherErr) {
    return NextResponse.json({ error: otherErr.message }, { status: 500 });
  }
  if (existingOther && existingOther.length > 0) {
    return NextResponse.json(
      { error: `Este CNPJ já está cadastrado como ${otherTable === "companies" ? "Empresa" : "Prefeitura"}.` },
      { status: 409 }
    );
  }

  const table = kindToTable(detected.kind);
  if (!table) {
    return NextResponse.json({ error: "Tipo não suportado." }, { status: 400 });
  }

  if (table === "companies") {
    const razao_social = String(body?.razao_social || "").trim();
    const municipio = String(body?.municipio || "").trim();
    const uf = String(body?.uf || "").trim();
    const tags = Array.isArray(body?.tags_produtos_servicos) ? body.tags_produtos_servicos : [];

    if (!razao_social || !municipio || !uf) {
      return NextResponse.json({ error: "Preencha razão social, município e UF." }, { status: 400 });
    }

    const { error } = await supabaseServer.from("companies").insert({
      cnpj,
      razao_social,
      municipio,
      uf,
      tags_produtos_servicos: tags
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const nome_prefeitura = String(body?.nome_prefeitura || "").trim();
  const municipio = String(body?.municipio || "").trim();
  const uf = String(body?.uf || "").trim();
  const resolved = resolveBasinsByMunicipio({ uf, municipio });
  const bacias_hidrograficas = resolved.bacias.map((b) => b.code);
  const bacia_hidrografica = bacias_hidrograficas[0] ?? null; // compat with older column

  if (!nome_prefeitura || !municipio || !uf) {
    return NextResponse.json({ error: "Preencha nome da prefeitura, município e UF." }, { status: 400 });
  }

  const { error } = await supabaseServer.from("municipalities").insert({
    cnpj,
    nome_prefeitura,
    municipio,
    uf,
    bacia_hidrografica,
    bacias_hidrograficas
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

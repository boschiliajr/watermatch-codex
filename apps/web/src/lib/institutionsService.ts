import { detectInstitutionKind, type InstitutionKind } from "@/lib/institutionKind";
import { lookupCnpj } from "@/lib/cnpjLookup";
import { resolveBasinsByMunicipio } from "@/lib/bacias";
import { supabaseServer } from "@/lib/supabaseServer";

export type CreateInstitutionPayload =
  | {
      kind: "company";
      cnpj: string;
      razao_social: string;
      municipio: string;
      uf: string;
      tags_produtos_servicos?: string[];
      allow_mock?: boolean;
    }
  | {
      kind: "municipality";
      cnpj: string;
      nome_prefeitura: string;
      municipio: string;
      uf: string;
      allow_mock?: boolean;
    };

function kindToTable(kind: InstitutionKind) {
  if (kind === "company") return "companies";
  if (kind === "municipality") return "municipalities";
  return null;
}

export async function createInstitution(payload: CreateInstitutionPayload) {
  const { result, source } = await lookupCnpj(payload.cnpj);
  const detected = detectInstitutionKind(result);

  if (source === "mock" && !payload.allow_mock) {
    return { ok: false as const, status: 422, code: "LOOKUP_MOCK_BLOCKED", message: "Lookup em modo mock requer confirmacao explicita." };
  }

  if (detected.kind === "unknown") {
    return {
      ok: false as const,
      status: 422,
      code: "KIND_UNKNOWN",
      message: "Nao foi possivel determinar o tipo da instituicao para este CNPJ.",
      details: { reason: detected.reason }
    };
  }

  if (detected.kind === "government_other") {
    return {
      ok: false as const,
      status: 422,
      code: "KIND_GOVERNMENT_NOT_ALLOWED",
      message: "Este CNPJ parece ser de orgao publico que nao e prefeitura.",
      details: { reason: detected.reason }
    };
  }

  if (detected.kind !== payload.kind) {
    return {
      ok: false as const,
      status: 422,
      code: "KIND_MISMATCH",
      message:
        detected.kind === "municipality"
          ? "Este CNPJ parece ser de uma prefeitura. Cadastre como prefeitura."
          : "Este CNPJ parece ser de uma empresa. Cadastre como empresa."
    };
  }

  const otherTable = detected.kind === "company" ? "municipalities" : "companies";
  const { data: existingOther, error: otherErr } = await supabaseServer.from(otherTable).select("id").eq("cnpj", payload.cnpj).limit(1);
  if (otherErr) return { ok: false as const, status: 500, code: "DB_ERROR", message: otherErr.message };
  if ((existingOther || []).length > 0) {
    return {
      ok: false as const,
      status: 409,
      code: "CNPJ_ALREADY_IN_OTHER_TABLE",
      message: `Este CNPJ ja esta cadastrado como ${otherTable === "companies" ? "Empresa" : "Prefeitura"}.`
    };
  }

  const table = kindToTable(detected.kind);
  if (!table) return { ok: false as const, status: 400, code: "INVALID_KIND", message: "Tipo nao suportado." };

  if (table === "companies" && payload.kind === "company") {
    const { error } = await supabaseServer.from("companies").insert({
      cnpj: payload.cnpj,
      razao_social: payload.razao_social.trim(),
      municipio: payload.municipio.trim(),
      uf: payload.uf.trim().toUpperCase(),
      tags_produtos_servicos: payload.tags_produtos_servicos || []
    });
    if (error) return { ok: false as const, status: 400, code: "DB_ERROR", message: error.message };
    return { ok: true as const, source };
  }

  if (payload.kind !== "municipality") return { ok: false as const, status: 400, code: "INVALID_KIND", message: "Payload invalido." };
  const resolved = resolveBasinsByMunicipio({ uf: payload.uf, municipio: payload.municipio });
  const bacias_hidrograficas = resolved.bacias.map((b) => b.code);
  const bacia_hidrografica = bacias_hidrograficas[0] ?? null;

  const { error } = await supabaseServer.from("municipalities").insert({
    cnpj: payload.cnpj,
    nome_prefeitura: payload.nome_prefeitura.trim(),
    municipio: payload.municipio.trim(),
    uf: payload.uf.trim().toUpperCase(),
    bacia_hidrografica,
    bacias_hidrograficas
  });
  if (error) return { ok: false as const, status: 400, code: "DB_ERROR", message: error.message };
  return { ok: true as const, source };
}

export async function deleteInstitution(kind: string, id: string) {
  if (kind === "company") {
    const { error } = await supabaseServer.from("companies").delete().eq("id", id);
    if (error) return { ok: false as const, status: 400, code: "DB_ERROR", message: error.message };
    return { ok: true as const };
  }
  if (kind === "municipality") {
    const { error } = await supabaseServer.from("municipalities").delete().eq("id", id);
    if (error) return { ok: false as const, status: 400, code: "DB_ERROR", message: error.message };
    return { ok: true as const };
  }
  return { ok: false as const, status: 400, code: "INVALID_KIND", message: "Tipo invalido." };
}


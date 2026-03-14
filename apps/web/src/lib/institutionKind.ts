export type InstitutionKind = "company" | "municipality" | "government_other" | "unknown";

export type InstitutionKindConfidence = "high" | "medium" | "low";

export type NaturezaJuridica = {
  codigo?: string | null;
  descricao?: string | null;
};

export type Cnae = {
  codigo?: string | null;
  descricao?: string | null;
};

export type CnpjExtracted = {
  razao_social: string;
  municipio: string;
  uf: string;
  natureza_juridica?: NaturezaJuridica | null;
  cnae_principal?: Cnae | null;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(haystack: string, needles: string[]) {
  return needles.some((n) => haystack.includes(n));
}

function normalizeCnaeCode(code: string) {
  // Common formats: "8411-6/00", "84.11-6-00", "8411600"
  const digits = code.replace(/\D/g, "");
  if (digits.length < 2) return null;
  return digits;
}

export function detectInstitutionKind(extracted: CnpjExtracted): {
  kind: InstitutionKind;
  confidence: InstitutionKindConfidence;
  reason: string;
} {
  const razaoN = normalize(extracted.razao_social || "");
  const naturezaDescN = normalize(extracted.natureza_juridica?.descricao || "");
  const naturezaCode = String(extracted.natureza_juridica?.codigo || "").trim();
  const cnaeCodeRaw = String(extracted.cnae_principal?.codigo || "").trim();
  const cnaeDigits = cnaeCodeRaw ? normalizeCnaeCode(cnaeCodeRaw) : null;

  const municipalKeywords = [
    "prefeitura",
    "municipio",
    "mun de ",
    "munic",
    "camara municipal",
    "câmara municipal",
    "secretaria municipal",
    "fundo municipal"
  ].map((k) => normalize(k));

  const govKeywords = [
    "governo",
    "estado",
    "secretaria",
    "autarquia",
    "fundacao",
    "fundação",
    "orgao publico",
    "órgão público",
    "ministerio",
    "ministério"
  ].map((k) => normalize(k));

  const razaoLooksMunicipal = hasAny(razaoN, municipalKeywords);
  const razaoLooksGov = razaoLooksMunicipal || hasAny(razaoN, govKeywords);

  // 1) Natureza jurídica (primary)
  if (naturezaDescN) {
    if (naturezaDescN.includes("municip") || naturezaDescN.includes("prefeitura")) {
      return { kind: "municipality", confidence: "high", reason: "natureza_juridica_indica_municipal" };
    }

    if (
      naturezaDescN.includes("orgao publico") ||
      naturezaDescN.includes("órgão público") ||
      naturezaDescN.includes("autarquia") ||
      naturezaDescN.includes("fundacao publica") ||
      naturezaDescN.includes("fundação publica") ||
      naturezaDescN.includes("poder executivo") ||
      naturezaDescN.includes("poder legislativo")
    ) {
      if (naturezaDescN.includes("municip")) {
        return { kind: "municipality", confidence: "high", reason: "natureza_juridica_publica_municipal" };
      }
      return { kind: "government_other", confidence: "high", reason: "natureza_juridica_publica_nao_municipal" };
    }
  }

  // Some datasets provide only code; keep it as a weak signal (do not guess municipality from it).
  if (naturezaCode && (naturezaCode === "1015" || naturezaCode === "1031")) {
    // Codes vary by provider; treat as "public" but not necessarily municipal.
    return { kind: razaoLooksMunicipal ? "municipality" : "government_other", confidence: "medium", reason: "natureza_juridica_codigo_publico" };
  }

  // 2) CNAE (fallback) - section 84 = Administração pública, defesa e seguridade social
  if (cnaeDigits && cnaeDigits.startsWith("84")) {
    if (razaoLooksMunicipal) {
      return { kind: "municipality", confidence: "medium", reason: "cnae_admin_publica_e_nome_municipal" };
    }
    return { kind: "government_other", confidence: "medium", reason: "cnae_admin_publica" };
  }

  // 3) Text heuristics (last resort)
  if (razaoLooksMunicipal) {
    return { kind: "municipality", confidence: "low", reason: "razao_social_indica_municipal" };
  }
  if (razaoLooksGov) {
    return { kind: "government_other", confidence: "low", reason: "razao_social_indica_orgao_publico" };
  }

  // 4) Default: treat as company if there are no public-sector signals.
  return { kind: "company", confidence: "low", reason: "sem_indicios_de_orgao_publico" };
}


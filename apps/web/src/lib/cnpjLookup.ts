import type { Cnae, CnpjExtracted, NaturezaJuridica } from "@/lib/institutionKind";

const VALE_DO_PARAIBA = [
  "sao jose dos campos",
  "taubate",
  "pindamonhangaba",
  "cacapava",
  "jacarei",
  "guaratingueta",
  "lorena",
  "cruzeiro",
  "ubatuba",
  "caraguatatuba",
  "ilha bela",
  "ilhabela"
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function pickFirstString(...candidates: any[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return null;
}

function extractNaturezaJuridica(data: any): NaturezaJuridica | null {
  const raw =
    data?.natureza_juridica ??
    data?.naturezaJuridica ??
    data?.natureza_juridica_empresa ??
    data?.naturezaJuridicaEmpresa ??
    data?.naturezaJuridica?.descricao ??
    data?.naturezaJuridica?.nome ??
    null;

  if (!raw) return null;

  if (typeof raw === "string") {
    return { descricao: raw, codigo: pickFirstString(data?.natureza_juridica_codigo, data?.naturezaJuridicaCodigo) };
  }

  if (typeof raw === "object") {
    const descricao = pickFirstString(raw?.descricao, raw?.nome, raw?.texto, raw?.label);
    const codigo = pickFirstString(raw?.codigo, raw?.id);
    if (!descricao && !codigo) return null;
    return { descricao, codigo };
  }

  return null;
}

function extractCnaePrincipal(data: any): Cnae | null {
  const raw =
    data?.cnae_principal ??
    data?.cnaePrincipal ??
    data?.cnaeFiscal ??
    data?.atividade_principal ??
    data?.atividadePrincipal ??
    null;

  if (!raw) return null;

  // Some providers return { codigo, descricao }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const codigo = pickFirstString(raw?.codigo, raw?.code, raw?.id);
    const descricao = pickFirstString(raw?.descricao, raw?.text, raw?.nome, raw?.label);
    if (!codigo && !descricao) return null;
    return { codigo, descricao };
  }

  // Others return arrays; pick the first entry.
  if (Array.isArray(raw) && raw.length > 0) {
    const first = raw[0];
    if (typeof first === "string") return { codigo: first, descricao: null };
    if (typeof first === "object") {
      const codigo = pickFirstString(first?.codigo, first?.code, first?.id);
      const descricao = pickFirstString(first?.descricao, first?.text, first?.nome, first?.label);
      if (!codigo && !descricao) return null;
      return { codigo, descricao };
    }
  }

  if (typeof raw === "string") return { codigo: raw, descricao: null };
  return null;
}

export type CnpjLookupResult = CnpjExtracted & {
  bacia_hidrografica: string | null;
};

function extractFromOpenCnpj(payload: any): CnpjLookupResult | null {
  const data = payload?.data ?? payload;
  const razao_social = pickFirstString(
    data?.razaoSocial,
    data?.razao_social,
    data?.razaoSocialEmpresarial,
    data?.razao,
    data?.nomeEmpresarial,
    data?.nome
  );

  const municipio = pickFirstString(data?.municipio, data?.cidade, data?.municipioIbge, data?.municipio_descricao);
  const uf = pickFirstString(data?.uf, data?.estado, data?.ufSigla, data?.uf_sigla);

  if (!razao_social || !municipio || !uf) return null;

  const natureza_juridica = extractNaturezaJuridica(data);
  const cnae_principal = extractCnaePrincipal(data);

  const normalizedMunicipio = normalize(municipio);
  const isVale = VALE_DO_PARAIBA.includes(normalizedMunicipio);

  return {
    razao_social,
    municipio,
    uf,
    natureza_juridica,
    cnae_principal,
    bacia_hidrografica: isVale ? "CBH-PS" : null
  };
}

function mockLookup(cnpj: string): CnpjLookupResult {
  const seed = cnpj.replace(/\D/g, "").slice(-2);
  const options = [
    { razao_social: "AquaTech Solucoes Ltda", municipio: "São José dos Campos", uf: "SP" },
    { razao_social: "BlueFlow Engenharia", municipio: "Taubaté", uf: "SP" },
    { razao_social: "HidroMap Consultoria", municipio: "Campinas", uf: "SP" },
    { razao_social: "EcoSaneamento Brasil", municipio: "São Paulo", uf: "SP" },
    { razao_social: "NorteVerde Tecnologia", municipio: "Belém", uf: "PA" }
  ];

  const pick = options[Number(seed) % options.length];
  const normalizedMunicipio = normalize(pick.municipio);
  const isVale = VALE_DO_PARAIBA.includes(normalizedMunicipio);

  return {
    ...pick,
    natureza_juridica: null,
    cnae_principal: null,
    bacia_hidrografica: isVale ? "CBH-PS" : null
  };
}

async function openCnpjLookup(cnpj: string): Promise<CnpjLookupResult | null> {
  const clean = cnpj.replace(/\D/g, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://api.opencnpj.org/${clean}`, {
      signal: controller.signal,
      headers: { "User-Agent": "WaterTech-Match-PIT" }
    });

    if (!res.ok) return null;

    const payload = await res.json();
    return extractFromOpenCnpj(payload);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function lookupCnpj(cnpj: string): Promise<{ result: CnpjLookupResult; source: "opencnpj" | "mock" }> {
  const live = await openCnpjLookup(cnpj);
  if (live) return { result: live, source: "opencnpj" };
  return { result: mockLookup(cnpj), source: "mock" };
}


import { NextRequest, NextResponse } from "next/server";

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
    .replace(/\p{Diacritic}/gu, "");
}

function extractFromOpenCnpj(payload: any) {
  const data = payload?.data ?? payload;
  const razao_social =
    data?.razaoSocial ?? data?.razao_social ?? data?.razaoSocialEmpresarial ?? data?.razao;
  const municipio = data?.municipio ?? data?.cidade ?? data?.municipioIbge;
  const uf = data?.uf ?? data?.estado ?? data?.ufSigla;

  if (!razao_social || !municipio || !uf) {
    return null;
  }

  return { razao_social, municipio, uf };
}

function mockLookup(cnpj: string) {
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
    bacia_hidrografica: isVale ? "CBH-PS" : null
  };
}

async function openCnpjLookup(cnpj: string) {
  const clean = cnpj.replace(/\D/g, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(`https://api.opencnpj.org/${clean}`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "WaterTech-Match-PIT"
      }
    });

    if (!res.ok) {
      return null;
    }

    const payload = await res.json();
    const extracted = extractFromOpenCnpj(payload);
    if (!extracted) return null;

    const normalizedMunicipio = normalize(extracted.municipio);
    const isVale = VALE_DO_PARAIBA.includes(normalizedMunicipio);

    return {
      ...extracted,
      bacia_hidrografica: isVale ? "CBH-PS" : null
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const cnpj = String(body?.cnpj || "");

  if (!cnpj) {
    return NextResponse.json({ error: "CNPJ obrigatório" }, { status: 400 });
  }

  const live = await openCnpjLookup(cnpj);
  if (live) {
    return NextResponse.json(live);
  }

  const fallback = mockLookup(cnpj);
  return NextResponse.json(fallback);
}

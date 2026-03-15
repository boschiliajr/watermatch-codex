import { lookupCnpj } from "@/lib/cnpjLookup";
import { fallbackSuggestTipologiasByKeywords, findTipologiaByCode, listMpoTipologias } from "@/lib/mpoCatalog";

export type EnrichedServiceSuggestion = {
  tipologiaCodigo: string;
  confidence: number;
  justification: string;
  evidence: string[];
  source: "llm" | "hybrid" | "api";
};

export type CompanyEnrichmentResult = {
  services: string[];
  suggestions: EnrichedServiceSuggestion[];
  webEvidence: string[];
  used: {
    opencnpj: boolean;
    web: boolean;
    llm: boolean;
  };
};

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniq<T>(arr: T[]) {
  return [...new Set(arr)];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function searchWeb(companyName: string): Promise<{ snippets: string[]; used: boolean }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return { snippets: [], used: false };

  const res = await fetchWithTimeout(
    "https://google.serper.dev/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey
      },
      body: JSON.stringify({ q: `${companyName} serviços produtos saneamento água`, gl: "br", hl: "pt-br", num: 5 })
    },
    9000
  );

  if (!res.ok) return { snippets: [], used: true };
  const payload = (await res.json().catch(() => ({}))) as any;
  const snippets = [
    ...((payload?.organic || []) as any[]).map((x) => `${x?.title || ""} ${x?.snippet || ""}`.trim()),
    ...((payload?.knowledgeGraph?.description ? [String(payload.knowledgeGraph.description)] : []) as string[])
  ]
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 8);
  return { snippets, used: true };
}

function parseJsonBlock(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callOpenAiForSuggestions(params: {
  companyName: string;
  cnae: string | null;
  servicesSeed: string[];
  webSnippets: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const catalog = listMpoTipologias().map((x) => ({
    tipologia_codigo: x.tipologia_codigo,
    descricao_tipologia: x.descricao_tipologia
  }));

  const system = [
    "Voce classifica empresas para tipologias FEHIDRO.",
    "Retorne JSON estrito no formato:",
    '{"services":[string], "suggestions":[{"tipologiaCodigo":"T.x.x.x","confidence":0.0,"justification":"...","evidence":[string]}]}',
    "Use confidence entre 0 e 1.",
    "Nao invente codigos fora do catalogo fornecido."
  ].join(" ");

  const userPayload = {
    company: params.companyName,
    cnae: params.cnae,
    seeds: params.servicesSeed,
    web_snippets: params.webSnippets,
    catalog
  };

  const response = await fetchWithTimeout(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: [{ type: "input_text", text: system }] },
          { role: "user", content: [{ type: "input_text", text: JSON.stringify(userPayload) }] }
        ],
        max_output_tokens: 1500
      })
    },
    12000
  );

  if (!response.ok) return null;
  const raw = (await response.json().catch(() => ({}))) as any;
  const text = String(raw?.output_text || raw?.output?.[0]?.content?.[0]?.text || "");
  if (!text) return null;
  return parseJsonBlock(text);
}

export async function enrichCompanyForTipologias(params: {
  cnpj: string;
  razao_social: string;
  municipio: string;
  uf: string;
  existingTags: string[];
}) : Promise<CompanyEnrichmentResult> {
  const cnpjData = await lookupCnpj(params.cnpj);
  const cnae = cnpjData.result.cnae_principal?.codigo || null;
  const cnaeDesc = cnpjData.result.cnae_principal?.descricao || null;
  const companyName = params.razao_social;

  const servicesSeed = uniq(
    [
      ...params.existingTags,
      ...(cnae ? [`CNAE ${cnae}`] : []),
      ...(cnaeDesc ? [cnaeDesc] : []),
      companyName
    ]
      .map((x) => String(x || "").trim())
      .filter(Boolean)
  );

  const web = await searchWeb(companyName);
  const llmRaw = await callOpenAiForSuggestions({
    companyName,
    cnae,
    servicesSeed,
    webSnippets: web.snippets
  });

  const llmServices = Array.isArray(llmRaw?.services)
    ? llmRaw.services.map((x: unknown) => String(x || "").trim()).filter(Boolean).slice(0, 12)
    : [];

  const llmSuggestions = Array.isArray(llmRaw?.suggestions)
    ? llmRaw.suggestions
        .map((x: any) => ({
          tipologiaCodigo: String(x?.tipologiaCodigo || "").trim(),
          confidence: Number(x?.confidence ?? 0),
          justification: String(x?.justification || ""),
          evidence: Array.isArray(x?.evidence) ? x.evidence.map((e: unknown) => String(e)) : []
        }))
        .filter((x: any) => findTipologiaByCode(x.tipologiaCodigo))
        .map((x: any) => ({
          tipologiaCodigo: x.tipologiaCodigo,
          confidence: Math.max(0, Math.min(1, Number.isFinite(x.confidence) ? x.confidence : 0)),
          justification: x.justification || "Sugestao gerada por inferencia semantica.",
          evidence: x.evidence.slice(0, 4),
          source: web.used ? ("hybrid" as "hybrid" | "llm") : ("llm" as "hybrid" | "llm")
        }))
    : [];

  const fallbackServices = uniq([...servicesSeed, ...llmServices, ...web.snippets]).slice(0, 20);
  const fallback = fallbackSuggestTipologiasByKeywords({ services: fallbackServices, maxItems: 10 }).map((x) => ({
    tipologiaCodigo: x.tipologiaCodigo,
    confidence: x.confidence,
    justification: x.justification,
    evidence: fallbackServices.slice(0, 2),
    source: web.used ? ("hybrid" as "hybrid" | "api") : ("api" as "hybrid" | "api")
  }));

  const combinedByCode = new Map<string, EnrichedServiceSuggestion>();
  for (const item of [...fallback, ...llmSuggestions]) {
    const existing = combinedByCode.get(item.tipologiaCodigo);
    if (!existing || item.confidence > existing.confidence) {
      combinedByCode.set(item.tipologiaCodigo, item);
    }
  }

  const suggestions = [...combinedByCode.values()]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 12);

  return {
    services: uniq([...servicesSeed, ...llmServices]).slice(0, 20),
    suggestions,
    webEvidence: web.snippets.slice(0, 8),
    used: {
      opencnpj: cnpjData.source === "opencnpj",
      web: web.used,
      llm: Boolean(llmRaw)
    }
  };
}

export function shouldAutoApproveSuggestion(confidence: number) {
  return Number(confidence || 0) >= 0.87;
}

export function summarizeEvidence(evidence: string[]) {
  return evidence
    .map((x) => normalize(x))
    .filter(Boolean)
    .slice(0, 4);
}

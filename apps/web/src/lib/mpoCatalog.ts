import mpoCatalogJson from "@/data/mpo-tipologias.json";

export type MpoTipologiaCatalogItem = {
  tipologia_codigo: string;
  descricao_tipologia: string;
  pdc_codigo: string | null;
  subpdc_codigo: string | null;
};

type MpoCatalogShape = {
  source: string;
  generated_at: string;
  tipologias: MpoTipologiaCatalogItem[];
};

function normalize(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const catalog = mpoCatalogJson as MpoCatalogShape;

const byCode = new Map<string, MpoTipologiaCatalogItem>();
for (const row of catalog.tipologias || []) {
  byCode.set(row.tipologia_codigo, row);
}

export function listMpoTipologias() {
  return [...(catalog.tipologias || [])];
}

export function findTipologiaByCode(code: string) {
  return byCode.get(String(code || "").trim()) || null;
}

export function scoreServiceToTipologia(serviceText: string, tipologia: MpoTipologiaCatalogItem) {
  const serviceTokens = new Set(
    normalize(serviceText)
      .split(/[^a-z0-9]+/g)
      .filter((x) => x.length >= 4)
  );

  const tipTokens = normalize(tipologia.descricao_tipologia)
    .split(/[^a-z0-9]+/g)
    .filter((x) => x.length >= 4);

  if (!serviceTokens.size || !tipTokens.length) return 0;

  let overlap = 0;
  for (const tk of tipTokens) {
    if (serviceTokens.has(tk)) overlap += 1;
  }
  return overlap / Math.max(1, Math.min(8, tipTokens.length));
}

export function fallbackSuggestTipologiasByKeywords(params: { services: string[]; maxItems?: number }) {
  const maxItems = params.maxItems ?? 8;
  const scored: Array<{ tipologiaCodigo: string; confidence: number; justification: string }> = [];
  for (const tip of catalog.tipologias || []) {
    let best = 0;
    let winner = "";
    for (const svc of params.services) {
      const s = scoreServiceToTipologia(svc, tip);
      if (s > best) {
        best = s;
        winner = svc;
      }
    }
    if (best < 0.2) continue;
    scored.push({
      tipologiaCodigo: tip.tipologia_codigo,
      confidence: Math.min(0.79, Number(best.toFixed(2))),
      justification: `Correspondencia textual com o servico: "${winner}".`
    });
  }
  return scored.sort((a, b) => b.confidence - a.confidence).slice(0, maxItems);
}

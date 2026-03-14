import type { TipologiaSuggestion } from "./types";

const KEYWORD_MAP: Array<{ keywords: string[]; tipologia: string; reason: string }> = [
  { keywords: ["esgoto", "esgotamento"], tipologia: "T.3.1.2", reason: "Saneamento e esgotamento" },
  { keywords: ["drenagem", "enchente", "alagamento"], tipologia: "T.3.2.1", reason: "Drenagem urbana" },
  { keywords: ["abastecimento", "água", "agua"], tipologia: "T.2.1.1", reason: "Abastecimento de água" },
  { keywords: ["reuso", "reúso", "reuso"], tipologia: "T.4.1.1", reason: "Reúso de água" },
  { keywords: ["resíduos", "residuos", "lixo"], tipologia: "T.5.1.1", reason: "Resíduos sólidos" }
];

export function suggestTipologia(descricaoProblema: string): TipologiaSuggestion | null {
  const normalized = descricaoProblema.toLowerCase();

  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return { tipologiaCodigo: entry.tipologia, reason: entry.reason };
    }
  }

  return null;
}

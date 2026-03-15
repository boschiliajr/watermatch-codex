export type TipologiaSuggestion = {
  tipologiaCodigo: string;
  reason: string;
};

export type MatchCandidate = {
  demandId: string;
  companyId: string;
  scoreCompatibilidade: number;
};

export type CompanyTipologia = {
  companyId: string;
  tipologiaCodigo: string;
  status: "suggested" | "approved" | "rejected";
  confidence: number;
  source: "manual" | "api" | "web" | "llm" | "hybrid";
};

export type CompanyEnrichmentJob = {
  id: string;
  companyId: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
};

export type EnrichedServiceSuggestion = {
  tipologiaCodigo: string;
  confidence: number;
  justification: string;
  evidence: string[];
};

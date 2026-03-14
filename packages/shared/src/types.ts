export type TipologiaSuggestion = {
  tipologiaCodigo: string;
  reason: string;
};

export type MatchCandidate = {
  demandId: string;
  companyId: string;
  scoreCompatibilidade: number;
};

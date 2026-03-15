import { describe, expect, it } from "vitest";
import { fallbackSuggestTipologiasByKeywords, findTipologiaByCode, listMpoTipologias } from "@/lib/mpoCatalog";
import { shouldAutoApproveSuggestion, summarizeEvidence } from "@/lib/companyEnrichment";

describe("mpo catalog", () => {
  it("loads tipologias from versioned JSON catalog", () => {
    const rows = listMpoTipologias();
    expect(rows.length).toBeGreaterThan(100);
    expect(findTipologiaByCode("T.3.1.2")).not.toBeNull();
  });

  it("fallback suggests codes by keyword overlap", () => {
    const suggestions = fallbackSuggestTipologiasByKeywords({
      services: ["execucao de obras de drenagem urbana e controle de enchentes"]
    });
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("applies auto-approval threshold and evidence normalization", () => {
    expect(shouldAutoApproveSuggestion(0.9)).toBe(true);
    expect(shouldAutoApproveSuggestion(0.5)).toBe(false);
    expect(summarizeEvidence([" Site oficial da empresa ", "SANEAMENTO BÁSICO", "SANEAMENTO BÁSICO"])).toEqual([
      "site oficial da empresa",
      "saneamento basico",
      "saneamento basico"
    ]);
  });
});

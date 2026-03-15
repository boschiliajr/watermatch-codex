import { describe, expect, it } from "vitest";
import { detectInstitutionKind } from "@/lib/institutionKind";
import { scoreMatch } from "@/lib/matchmaking";

describe("smoke flow", () => {
  it("classifies institution and produces non-zero score for compatible pair", () => {
    const institution = detectInstitutionKind({
      razao_social: "Prefeitura Municipal de Sao Jose dos Campos",
      municipio: "Sao Jose dos Campos",
      uf: "SP",
      natureza_juridica: { descricao: "Orgao Publico do Poder Executivo Municipal" }
    });
    expect(institution.kind).toBe("municipality");

    const score = scoreMatch({
      tipologiaCodigo: "T.3.1.2",
      companyTipologiasApproved: ["T.3.1.2"],
      companyTags: ["T.3.1.2", "esgoto"],
      demandDescription: "Demanda de rede de esgoto no centro",
      demandBasins: ["CBH-PS"],
      companyBasins: ["CBH-PS"],
      demandStatus: "open"
    });

    expect(score).toBeGreaterThan(0);
  });
});

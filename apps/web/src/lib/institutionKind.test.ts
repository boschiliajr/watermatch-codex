import { describe, expect, it } from "vitest";
import { detectInstitutionKind } from "@/lib/institutionKind";

describe("detectInstitutionKind", () => {
  it("classifies prefeitura as municipality", () => {
    const res = detectInstitutionKind({
      razao_social: "Prefeitura Municipal de Taubate",
      municipio: "Taubate",
      uf: "SP",
      natureza_juridica: { descricao: "Orgao Publico do Poder Executivo Municipal" }
    });
    expect(res.kind).toBe("municipality");
  });

  it("classifies private company as company", () => {
    const res = detectInstitutionKind({
      razao_social: "AquaTech Solucoes Ltda",
      municipio: "Sao Paulo",
      uf: "SP",
      natureza_juridica: { descricao: "Sociedade Empresaria Limitada" }
    });
    expect(res.kind).toBe("company");
  });
});


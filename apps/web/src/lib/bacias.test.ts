import { describe, expect, it } from "vitest";
import { resolveBasinsByMunicipio } from "@/lib/bacias";

describe("resolveBasinsByMunicipio", () => {
  it("returns basins for known SP municipality", () => {
    const res = resolveBasinsByMunicipio({ uf: "SP", municipio: "Sao Jose dos Campos" });
    expect(Array.isArray(res.bacias)).toBe(true);
    expect(res.bacias.length).toBeGreaterThan(0);
  });

  it("returns empty for unsupported UF", () => {
    const res = resolveBasinsByMunicipio({ uf: "RJ", municipio: "Rio de Janeiro" });
    expect(res.bacias).toEqual([]);
  });
});


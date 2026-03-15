import { describe, expect, it } from "vitest";
import { scoreMatch } from "@/lib/matchmaking";

describe("scoreMatch", () => {
  it("scores higher when tipologia and basin match", () => {
    const high = scoreMatch({
      tipologiaCodigo: "T.3.1.2",
      companyTipologiasApproved: ["T.3.1.2"],
      companyTags: ["T.3.1.2", "drenagem"],
      demandDescription: "Problema grave de esgoto e drenagem",
      demandBasins: ["CBH-PS"],
      companyBasins: ["CBH-PS"],
      demandStatus: "open"
    });

    const low = scoreMatch({
      tipologiaCodigo: "T.3.1.2",
      companyTipologiasApproved: [],
      companyTags: ["residuos"],
      demandDescription: "Problema grave de esgoto e drenagem",
      demandBasins: ["CBH-PS"],
      companyBasins: ["CBH-PCJ"],
      demandStatus: "open"
    });

    expect(high).toBeGreaterThan(low);
    expect(high).toBeLessThanOrEqual(100);
    expect(low).toBeGreaterThanOrEqual(0);
  });
});

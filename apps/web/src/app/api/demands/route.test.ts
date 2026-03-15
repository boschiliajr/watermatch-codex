import { beforeEach, describe, expect, it, vi } from "vitest";

const maybeSingle = vi.fn(async () => ({ data: { id: "tip-1" } }));
const insert = vi.fn(async () => ({ error: null }));

vi.mock("@/lib/supabaseServer", () => ({
  supabaseServer: {
    from: vi.fn((table: string) => {
      if (table === "fehidro_dictionary") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle
              })
            })
          })
        };
      }
      if (table === "demands") {
        return { insert };
      }
      return {};
    })
  }
}));

import { POST } from "@/app/api/demands/route";

describe("POST /api/demands", () => {
  beforeEach(() => {
    maybeSingle.mockClear();
    insert.mockClear();
  });

  it("rejects invalid payload", async () => {
    const req = new Request("http://localhost/api/demands", {
      method: "POST",
      body: JSON.stringify({
        municipality_id: "invalido",
        descricao_problema: "abc"
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it("creates demand with valid payload", async () => {
    const req = new Request("http://localhost/api/demands", {
      method: "POST",
      body: JSON.stringify({
        municipality_id: "53f5dfbe-ec7b-4dc8-8868-c46b8e8273f4",
        descricao_problema: "Problema de esgoto no bairro central",
        status: "open"
      })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});

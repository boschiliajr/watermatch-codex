import { beforeEach, describe, expect, it, vi } from "vitest";

const { runEnrichmentJobs, enqueueCompanyEnrichment, jobsEq, companyMaybeSingle } = vi.hoisted(() => ({
  runEnrichmentJobs: vi.fn(async () => ({ ok: true, processed: 1, completed: 1, failed: 0 }))
  ,
  enqueueCompanyEnrichment: vi.fn(async () => ({ jobId: "job-1", status: "pending" })),
  jobsEq: vi.fn(async () => ({ count: 1, error: null })),
  companyMaybeSingle: vi.fn(async () => ({
    data: {
      id: "53f5dfbe-ec7b-4dc8-8868-c46b8e8273f4",
      cnpj: "12345678000199",
      razao_social: "Empresa Teste",
      municipio: "Sao Paulo",
      uf: "SP",
      tags_produtos_servicos: []
    },
    error: null
  }))
}));

vi.mock("@/lib/runEnrichment", () => ({
  runEnrichmentJobs
}));
vi.mock("@/lib/companyEnrichmentJobs", () => ({
  enqueueCompanyEnrichment
}));
vi.mock("@/lib/supabaseServer", () => ({
  supabaseServer: {
    from: vi.fn((table: string) => {
      if (table === "company_enrichment_jobs") {
        return {
          select: () => ({
            eq: jobsEq
          })
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({
              limit: () => ({
                maybeSingle: companyMaybeSingle
              })
            })
          })
        };
      }
      return {};
    })
  }
}));

import { POST } from "@/app/api/enrichment/run/route";

describe("POST /api/enrichment/run", () => {
  beforeEach(() => {
    runEnrichmentJobs.mockClear();
    enqueueCompanyEnrichment.mockClear();
    jobsEq.mockClear();
    companyMaybeSingle.mockClear();
  });

  it("runs in batch mode when no company_id is provided", async () => {
    const req = new Request("http://localhost/api/enrichment/run", {
      method: "POST",
      body: JSON.stringify({ limit: 5 })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(runEnrichmentJobs).toHaveBeenCalledWith({ limit: 5, companyId: null });
  });

  it("runs for a specific company when company_id is provided", async () => {
    const req = new Request("http://localhost/api/enrichment/run", {
      method: "POST",
      body: JSON.stringify({ limit: 1, company_id: "53f5dfbe-ec7b-4dc8-8868-c46b8e8273f4" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(runEnrichmentJobs).toHaveBeenCalledWith({ limit: 1, companyId: "53f5dfbe-ec7b-4dc8-8868-c46b8e8273f4" });
  });

  it("auto-enqueues and re-runs when company has no job yet", async () => {
    runEnrichmentJobs
      .mockImplementationOnce(async () => ({ ok: true, processed: 0, completed: 0, failed: 0 }))
      .mockImplementationOnce(async () => ({ ok: true, processed: 1, completed: 1, failed: 0 }));
    jobsEq.mockImplementationOnce(async () => ({ count: 0, error: null }));

    const req = new Request("http://localhost/api/enrichment/run", {
      method: "POST",
      body: JSON.stringify({ limit: 3, company_id: "53f5dfbe-ec7b-4dc8-8868-c46b8e8273f4" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(enqueueCompanyEnrichment).toHaveBeenCalledTimes(1);
    expect(runEnrichmentJobs).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when enrichment runner throws", async () => {
    runEnrichmentJobs.mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const req = new Request("http://localhost/api/enrichment/run", {
      method: "POST",
      body: JSON.stringify({ limit: 2 })
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

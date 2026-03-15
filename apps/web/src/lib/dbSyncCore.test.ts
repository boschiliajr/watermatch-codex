import { describe, expect, it } from "vitest";
import {
  evaluateSyncAction,
  extractProjectRefFromSupabaseUrl,
  listCommandFor,
  migrateCommandFor,
  normalizeTarget,
  parseAppliedVersion
} from "../../../../scripts/db-sync-core.mjs";

describe("db-sync core", () => {
  it("chooses local by default", () => {
    expect(normalizeTarget({ appEnv: "local", dbTarget: "" })).toBe("local");
  });

  it("chooses staging from APP_ENV", () => {
    expect(normalizeTarget({ appEnv: "staging", dbTarget: "" })).toBe("staging");
  });

  it("parses latest applied migration version from text", () => {
    const raw = "20260314193000 | applied\n20260315101010 | pending";
    expect(parseAppliedVersion(raw)).toBe("20260315101010");
  });

  it("returns noop when target is up-to-date", () => {
    const result = evaluateSyncAction({
      appEnv: "local",
      latestVersion: "20260314193000",
      appliedVersion: "20260314193000"
    });
    expect(result.action).toBe("noop");
  });

  it("returns migrate when target is outdated", () => {
    const result = evaluateSyncAction({
      appEnv: "local",
      latestVersion: "20260315120000",
      appliedVersion: "20260314193000"
    });
    expect(result.action).toBe("migrate");
  });

  it("blocks auto migration in production", () => {
    const result = evaluateSyncAction({
      appEnv: "production",
      latestVersion: "20260315120000",
      appliedVersion: "20260314193000"
    });
    expect(result.action).toBe("blocked");
  });

  it("extracts project ref from supabase url", () => {
    expect(extractProjectRefFromSupabaseUrl("https://abcd1234.supabase.co")).toBe("abcd1234");
    expect(extractProjectRefFromSupabaseUrl("")).toBe("");
  });

  it("builds local and staging commands", () => {
    expect(listCommandFor("local", "")).toEqual(["supabase", "migration", "list", "--local"]);
    expect(migrateCommandFor("local", "")).toEqual(["supabase", "migration", "up", "--local"]);
    expect(listCommandFor("staging", "proj")).toEqual(["supabase", "migration", "list", "--linked"]);
    expect(migrateCommandFor("staging", "proj")).toEqual(["supabase", "db", "push", "--linked"]);
  });
});

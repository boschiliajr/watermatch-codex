import fs from "node:fs";
import path from "node:path";

const MIGRATION_FILE_RE = /^(\d{14})_.*\.sql$/;

export function normalizeTarget({ appEnv, dbTarget }) {
  const env = String(appEnv || "").toLowerCase();
  const explicit = String(dbTarget || "").toLowerCase();

  if (explicit === "local" || explicit === "staging") return explicit;
  if (env === "staging") return "staging";
  return "local";
}

export function isDryRunFlag(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase());
}

export function latestLocalMigrationVersion(migrationsDir) {
  if (!fs.existsSync(migrationsDir)) return null;
  const files = fs.readdirSync(migrationsDir).filter((f) => MIGRATION_FILE_RE.test(f));
  if (files.length === 0) return null;
  const versions = files.map((f) => f.match(MIGRATION_FILE_RE)?.[1]).filter(Boolean);
  return versions.sort().at(-1) ?? null;
}

export function parseAppliedVersion(raw) {
  if (!raw || !String(raw).trim()) return null;

  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) {
      const values = parsed
        .map((x) => String(x?.version || x?.id || x?.name || ""))
        .map((v) => (v.match(/\b\d{14}\b/) || [])[0])
        .filter(Boolean)
        .sort();
      return values.at(-1) ?? null;
    }
  } catch {
    // fall back to text parser
  }

  const tokens = String(raw).match(/\b\d{14}\b/g) || [];
  if (!tokens.length) return null;
  return tokens.sort().at(-1) ?? null;
}

export function compareVersions(a, b) {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.localeCompare(b);
}

export function evaluateSyncAction({ appEnv, latestVersion, appliedVersion }) {
  const env = String(appEnv || "").toLowerCase();
  if (env === "production") {
    return { action: "blocked", reason: "production_blocked" };
  }
  if (!latestVersion) {
    return { action: "noop", reason: "no_local_migrations" };
  }
  if (compareVersions(appliedVersion, latestVersion) >= 0) {
    return { action: "noop", reason: "up_to_date" };
  }
  return { action: "migrate", reason: "outdated" };
}

export function listCommandFor(target, projectRef) {
  if (target === "local") return ["supabase", "migration", "list", "--local"];
  return ["supabase", "migration", "list", "--linked"];
}

export function migrateCommandFor(target, projectRef) {
  if (target === "local") return ["supabase", "migration", "up", "--local"];
  return ["supabase", "db", "push", "--linked"];
}

export function extractProjectRefFromSupabaseUrl(urlValue) {
  const url = String(urlValue || "").trim();
  const match = url.match(/^https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match?.[1] ?? "";
}

export function defaultMigrationsDir(repoRoot) {
  return path.join(repoRoot, "supabase", "migrations");
}

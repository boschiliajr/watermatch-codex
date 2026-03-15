#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  defaultMigrationsDir,
  evaluateSyncAction,
  extractProjectRefFromSupabaseUrl,
  isDryRunFlag,
  latestLocalMigrationVersion,
  listCommandFor,
  migrateCommandFor,
  normalizeTarget,
  parseAppliedVersion
} from "./db-sync-core.mjs";

function runCommand(args, env) {
  const [cmd, ...rest] = args;
  const res = spawnSync(cmd, rest, {
    stdio: "pipe",
    encoding: "utf8",
    env
  });
  return {
    status: res.status ?? 1,
    error: res.error ? String(res.error.message || res.error) : "",
    stdout: String(res.stdout || ""),
    stderr: String(res.stderr || "")
  };
}

function logStatus(payload) {
  process.stdout.write(`[db-sync] ${JSON.stringify(payload)}\n`);
}

function fail(message, details) {
  logStatus({ action: "error", message, details });
  process.exit(1);
}

function softFail(message, details) {
  logStatus({ action: "warning", message, details });
  process.exit(0);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  const repoRoot = process.cwd();
  loadEnvFile(path.join(repoRoot, ".env.local"));
  loadEnvFile(path.join(repoRoot, ".env"));

  const appEnv = process.env.APP_ENV || "local";
  let target = normalizeTarget({ appEnv, dbTarget: process.env.DB_TARGET });
  const dryRun = isDryRunFlag(process.env.DB_SYNC_DRY_RUN);
  const failOpen = !["0", "false", "no", "off"].includes(String(process.env.DB_SYNC_FAIL_OPEN || "1").toLowerCase());
  const inferredProjectRef = extractProjectRefFromSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const projectRef = process.env.SUPABASE_PROJECT_REF || inferredProjectRef;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN || "";

  const migrationsDir = defaultMigrationsDir(repoRoot);
  const latestVersion = latestLocalMigrationVersion(migrationsDir);

  const env = { ...process.env };
  if (target === "staging" && accessToken) {
    env.SUPABASE_ACCESS_TOKEN = accessToken;
  }

  let listCmd = listCommandFor(target, projectRef);
  let listRes = runCommand(listCmd, env);

  // If local target isn't available, attempt remote sync automatically when the project ref is known.
  if (target === "local" && listRes.status !== 0 && projectRef) {
    logStatus({
      action: "fallback",
      from: "local",
      to: "staging",
      reason: "local_unavailable",
      details: listRes.error || listRes.stderr || "Falha ao acessar supabase local."
    });
    target = "staging";
    listCmd = listCommandFor(target, projectRef);
    listRes = runCommand(listCmd, env);
  }

  if (
    target === "staging" &&
    listRes.status !== 0 &&
    /Cannot find project ref/i.test(`${listRes.stderr}\n${listRes.stdout}`) &&
    projectRef
  ) {
    const linkCmd = ["supabase", "link", "--project-ref", projectRef];
    const linkRes = runCommand(linkCmd, env);
    if (linkRes.status === 0) {
      logStatus({ action: "link", target: "staging", projectRef, result: "linked" });
      listRes = runCommand(listCmd, env);
    } else {
      const details = {
        command: linkCmd.join(" "),
        error: linkRes.error,
        stderr: linkRes.stderr,
        stdout: linkRes.stdout
      };
      const forbidden = /Forbidden resource/i.test(`${linkRes.stderr}\n${linkRes.stdout}`);
      if (failOpen && forbidden && String(appEnv).toLowerCase() !== "production") {
        softFail("Sem permissao no projeto remoto para db-sync automatico. Prosseguindo sem sincronizar banco.", details);
      }
      fail("Falha ao linkar projeto Supabase automaticamente.", details);
    }
  }

  if (listRes.status !== 0) {
    const hint =
      target === "local"
        ? "Para target local, rode `supabase start` antes do dev. Alternativas: DB_TARGET=staging ou npm run dev:skip-db."
        : "Rode `supabase login` e `supabase link --project-ref <ref>` para habilitar alvo remoto.";
    const details = {
      command: listCmd.join(" "),
      hint,
      error: listRes.error,
      stderr: listRes.stderr,
      stdout: listRes.stdout
    };
    const forbidden = /Forbidden resource/i.test(`${listRes.stderr}\n${listRes.stdout}`);
    if (failOpen && forbidden && String(appEnv).toLowerCase() !== "production") {
      softFail("Sem permissao no projeto remoto para listar migrations. Prosseguindo sem sincronizar banco.", details);
    }
    fail("Falha ao listar migrations no alvo.", details);
  }
  const appliedVersion = parseAppliedVersion(listRes.stdout);

  const evaluation = evaluateSyncAction({ appEnv, latestVersion, appliedVersion });
  logStatus({
    target,
    appEnv,
    latestVersion,
    appliedVersion,
    action: evaluation.action,
    reason: evaluation.reason,
    dryRun
  });

  if (evaluation.action === "blocked") {
    fail("Auto-migracao bloqueada para production.");
  }
  if (evaluation.action === "noop") return;
  if (dryRun) {
    logStatus({ action: "noop", reason: "dry_run_enabled" });
    return;
  }

  const migrateCmd = migrateCommandFor(target, projectRef);
  const migrateRes = runCommand(migrateCmd, env);
  if (migrateRes.status !== 0) {
    const details = {
      command: migrateCmd.join(" "),
      error: migrateRes.error,
      stderr: migrateRes.stderr,
      stdout: migrateRes.stdout
    };
    const forbidden = /Forbidden resource/i.test(`${migrateRes.stderr}\n${migrateRes.stdout}`);
    if (failOpen && forbidden && String(appEnv).toLowerCase() !== "production") {
      softFail("Sem permissao no projeto remoto para aplicar migrations. Prosseguindo sem sincronizar banco.", details);
    }
    fail("Falha ao aplicar migrations.", details);
  }
  logStatus({ action: "migrated", target, toVersion: latestVersion });
}

main().catch((error) => fail("Erro inesperado no db-sync.", String(error?.stack || error)));

#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function fail(message) {
  process.stderr.write(`[sync-mpo-tipologias] ${message}\n`);
  process.exit(1);
}

function readCatalog(repoRoot) {
  const filePath = path.join(repoRoot, "apps", "web", "src", "data", "mpo-tipologias.json");
  if (!fs.existsSync(filePath)) fail(`Catalogo nao encontrado: ${filePath}`);
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = Array.isArray(parsed?.tipologias) ? parsed.tipologias : [];
  return rows
    .map((x) => ({
      tipologia_codigo: String(x.tipologia_codigo || "").trim(),
      descricao_tipologia: String(x.descricao_tipologia || "").trim(),
      pdc_codigo: x.pdc_codigo ? String(x.pdc_codigo).trim() : null,
      subpdc_codigo: x.subpdc_codigo ? String(x.subpdc_codigo).trim() : null
    }))
    .filter((x) => x.tipologia_codigo && x.descricao_tipologia);
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
  }

  const rows = readCatalog(process.cwd());
  if (!rows.length) fail("Catalogo vazio.");

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("fehidro_dictionary").upsert(rows, { onConflict: "tipologia_codigo" });
  if (error) fail(`Falha no upsert: ${error.message}`);

  process.stdout.write(`[sync-mpo-tipologias] synced=${rows.length}\n`);
}

main().catch((error) => fail(String(error?.stack || error)));

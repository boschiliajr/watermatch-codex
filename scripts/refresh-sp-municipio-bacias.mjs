#!/usr/bin/env node
/**
 * Refreshes apps/web/src/data/sp-municipio-bacias.json from SIGRH.
 *
 * Source: https://sigrh.sp.gov.br/municipios
 *
 * Usage:
 *   node scripts/refresh-sp-municipio-bacias.mjs
 *
 * This script intentionally fails loudly if the upstream HTML structure changes.
 */

import fs from "node:fs/promises";
import path from "node:path";

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html) {
  return String(html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseMunicipiosPage(html) {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  if (rows.length < 50) {
    throw new Error("Não consegui encontrar linhas suficientes (<tr>) na página. O formato do SIGRH pode ter mudado.");
  }

  const mapping = new Map(); // municipio_norm -> (code -> meta)

  for (const rowHtml of rows) {
    const cols = rowHtml.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (cols.length < 3) continue;

    const colText = cols.map((c) => decodeEntities(stripTags(c)));

    const municipio = colText[0] || "";
    if (!municipio || municipio.length < 3) continue;

    // Fallback assumption for typical table layout:
    // [municipio, ugrhi_num, ugrhi_nome, cbh_codigo, cbh_nome, ...]
    const ugrhiNum = Number((colText[1] || "").replace(/\D/g, "")) || undefined;
    const cbhCode =
      (colText.find((t) => /^CBH-/.test(t)) || "").match(/\bCBH-[A-Z]{1,4}\b/)?.[0] ||
      colText.find((t) => /\bCBH-/.test(t))?.match(/\bCBH-[A-Z]{1,4}\b/)?.[0] ||
      "";
    const cbhName = colText[4] || colText[3] || undefined;

    if (!cbhCode) continue;

    const municipioNorm = normalize(municipio);
    if (!mapping.has(municipioNorm)) mapping.set(municipioNorm, new Map());

    const byCode = mapping.get(municipioNorm);
    if (!byCode.has(cbhCode)) byCode.set(cbhCode, { code: cbhCode, ugrhi: ugrhiNum, name: cbhName });
  }

  if (mapping.size < 50) {
    throw new Error(`Parse result muito pequeno (${mapping.size} municípios). Provável mudança upstream; revise o parser.`);
  }

  const out = {};
  for (const [mun, byCode] of mapping.entries()) {
    const arr = Array.from(byCode.values()).sort((a, b) => a.code.localeCompare(b.code));
    out[mun] = arr;
  }

  const sortedKeys = Object.keys(out).sort((a, b) => a.localeCompare(b));
  const sortedOut = {};
  for (const k of sortedKeys) sortedOut[k] = out[k];

  return sortedOut;
}

async function main() {
  const url = "https://sigrh.sp.gov.br/municipios";
  const res = await fetch(url, { headers: { "User-Agent": "watermatch-codex/refresh-sp-municipio-bacias" } });
  if (!res.ok) throw new Error(`Falha ao baixar SIGRH (${res.status}).`);
  const html = await res.text();

  const municipios = parseMunicipiosPage(html);

  const dataset = {
    uf: "SP",
    version: 1,
    source: url,
    updated_at: new Date().toISOString().slice(0, 10),
    municipios
  };

  const repoRoot = process.cwd();
  const outPath = path.join(repoRoot, "apps", "web", "src", "data", "sp-municipio-bacias.json");
  await fs.writeFile(outPath, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  console.log(`Atualizado: ${outPath} (municípios: ${Object.keys(municipios).length})`);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});


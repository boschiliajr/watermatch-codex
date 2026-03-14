#!/usr/bin/env node
/**
 * Generates apps/web/src/data/sp-municipio-bacias.json from the XLS source of truth:
 *   apps/web/src/data/municipio_por_cbh_sinfehidro__novo.xls
 *
 * This script uses Windows' ACE OLEDB provider via PowerShell (no network required).
 *
 * Usage:
 *   node scripts/generate-sp-municipio-bacias-from-xls.mjs
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

function sortObjectKeys(obj) {
  const keys = Object.keys(obj).sort((a, b) => a.localeCompare(b));
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

function stableBasins(arr) {
  return [...arr].sort((a, b) => String(a.code).localeCompare(String(b.code)));
}

async function main() {
  const repoRoot = process.cwd();
  const xlsPath = path.join(
    repoRoot,
    "apps",
    "web",
    "src",
    "data",
    "municipio_por_cbh_sinfehidro__novo.xls"
  );
  const outPath = path.join(repoRoot, "apps", "web", "src", "data", "sp-municipio-bacias.json");

  const ps = String.raw`
$ErrorActionPreference = "Stop";
$path = "${xlsPath.replace(/\\/g, "\\\\")}";
$cs = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$path;Extended Properties='Excel 8.0;HDR=YES;IMEX=1'";

function Normalize-Text([string]$t) {
  if (-not $t) { return "" }
  $t = $t.ToLowerInvariant().Normalize([Text.NormalizationForm]::FormD)
  $t = [regex]::Replace($t, "\p{Mn}+", "")
  $t = [regex]::Replace($t, "\s+", " ").Trim()
  return $t
}

function Normalize-Sigla([string]$t) {
  $t = Normalize-Text $t
  $t = $t.ToUpperInvariant()
  # Keep only A-Z0-9
  $t = [regex]::Replace($t, "[^A-Z0-9]", "")
  return $t
}

$conn = New-Object System.Data.OleDb.OleDbConnection($cs);
$conn.Open();

$cmd = $conn.CreateCommand();
$cmd.CommandText = "SELECT [Município ], [CBH] FROM [Geral$] WHERE [Município ] IS NOT NULL AND [CBH] IS NOT NULL";
$adp = New-Object System.Data.OleDb.OleDbDataAdapter($cmd);
$dt = New-Object System.Data.DataTable;
[void]$adp.Fill($dt);

$rows = @();
foreach ($r in $dt.Rows) {
  $mun = [string]$r.Item("Município ");
  $cbh = [string]$r.Item("CBH");
  if (-not $mun -or -not $cbh) { continue }

  $mun_norm = Normalize-Text $mun

  $sigla = $null
  $name = $null
  if ($cbh -match " - ") {
    $parts = $cbh -split "\s-\s", 2
    $sigla = $parts[0].Trim()
    $name = $parts[1].Trim()
  } else {
    $sigla = $cbh.Trim()
    $name = $cbh.Trim()
  }

  $sigla_norm = Normalize-Sigla $sigla
  if (-not $sigla_norm) { continue }
  $code = "CBH-$sigla_norm"

  $rows += [pscustomobject]@{
    municipio_norm = $mun_norm
    code = $code
    name = $name
  }
}

$conn.Close();
  $rows | ConvertTo-Json -Depth 4
`;

  let raw;
  try {
    raw = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps],
      { encoding: "utf8", maxBuffer: 1024 * 1024 * 50 }
    );
  } catch (err) {
    // Some restricted environments block Node from spawning child processes.
    // In that case, run the PowerShell version instead:
    //   powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/generate-sp-municipio-bacias-from-xls.ps1
    if (String(err?.code || "").toUpperCase() === "EPERM") {
      console.error(
        "Este ambiente bloqueou spawn de subprocessos via Node (EPERM). Rode o gerador via PowerShell:\n" +
          "  powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/generate-sp-municipio-bacias-from-xls.ps1"
      );
      process.exit(1);
    }
    throw err;
  }

  /** @type {{ municipio_norm: string; code: string; name: string }[]} */
  const rows = JSON.parse(raw);

  /** @type {Record<string, {code: string; name?: string}[]>} */
  const municipios = {};

  for (const row of rows) {
    const mun = String(row.municipio_norm || "").trim();
    const code = String(row.code || "").trim();
    const name = String(row.name || "").trim();
    if (!mun || !code) continue;

    if (!municipios[mun]) municipios[mun] = [];
    if (!municipios[mun].some((b) => b.code === code)) {
      municipios[mun].push(name ? { code, name } : { code });
    }
  }

  for (const k of Object.keys(municipios)) {
    municipios[k] = stableBasins(municipios[k]);
  }

  const stat = await fs.stat(xlsPath);
  const updated_at = new Date(stat.mtimeMs).toISOString().slice(0, 10);

  const dataset = {
    uf: "SP",
    version: 1,
    source: "municipio_por_cbh_sinfehidro__novo.xls",
    updated_at,
    municipios: sortObjectKeys(municipios)
  };

  await fs.writeFile(outPath, JSON.stringify(dataset, null, 2) + "\n", "utf8");
  console.log(`Gerado: ${outPath} (municípios: ${Object.keys(municipios).length})`);
}

main().catch((err) => {
  console.error(err?.stack || err);
  process.exit(1);
});

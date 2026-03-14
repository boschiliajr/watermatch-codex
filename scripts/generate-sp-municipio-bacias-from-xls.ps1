$ErrorActionPreference = "Stop"

Set-StrictMode -Version Latest

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
  $t = [regex]::Replace($t, "[^A-Z0-9]", "")
  return $t
}

$repoRoot = (Get-Location).Path
$xlsPath = Join-Path $repoRoot "apps\web\src\data\municipio_por_cbh_sinfehidro__novo.xls"
$outPath = Join-Path $repoRoot "apps\web\src\data\sp-municipio-bacias.json"

if (-not (Test-Path $xlsPath)) {
  throw "XLS não encontrado: $xlsPath"
}

$cs = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$xlsPath;Extended Properties='Excel 8.0;HDR=YES;IMEX=1'"
$conn = New-Object System.Data.OleDb.OleDbConnection($cs)
$conn.Open()

try {
  $cmd = $conn.CreateCommand()
  # Avoid locale/encoding pitfalls with accented column names by selecting all columns
  # and reading by ordinal/actual discovered column names.
  $cmd.CommandText = 'SELECT * FROM [Geral$]'
  $adp = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
  $dt = New-Object System.Data.DataTable
  [void]$adp.Fill($dt)

  if ($dt.Columns.Count -lt 2) {
    throw "A aba Geral não tem colunas suficientes (esperava >= 2)."
  }
  $munCol = $dt.Columns[0].ColumnName
  $cbhCol = $dt.Columns[1].ColumnName

  # municipio_norm -> code -> meta
  $mapping = @{}

  foreach ($r in $dt.Rows) {
    $mun = [string]$r.Item($munCol)
    $cbh = [string]$r.Item($cbhCol)
    if (-not $mun -or -not $cbh) { continue }

    $munNorm = Normalize-Text $mun
    if (-not $munNorm) { continue }

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

    $siglaNorm = Normalize-Sigla $sigla
    if (-not $siglaNorm) { continue }

    $code = "CBH-$siglaNorm"

    if (-not $mapping.ContainsKey($munNorm)) {
      $mapping[$munNorm] = @{}
    }
    if (-not $mapping[$munNorm].ContainsKey($code)) {
      $mapping[$munNorm][$code] = @{ code = $code; name = $name }
    }
  }

  # Stable ordering
  $municipiosOut = [ordered]@{}
  foreach ($munKey in ($mapping.Keys | Sort-Object)) {
    $codes = $mapping[$munKey].Keys | Sort-Object
    $arr = @()
    foreach ($c in $codes) {
      $arr += $mapping[$munKey][$c]
    }
    $municipiosOut[$munKey] = $arr
  }

  $mtime = (Get-Item $xlsPath).LastWriteTime
  $updatedAt = $mtime.ToString("yyyy-MM-dd")

  $dataset = [ordered]@{
    uf = "SP"
    version = 1
    source = "municipio_por_cbh_sinfehidro__novo.xls"
    updated_at = $updatedAt
    municipios = $municipiosOut
  }

  $json = $dataset | ConvertTo-Json -Depth 10
  $json | Out-File -FilePath $outPath -Encoding utf8

  Write-Output ("Gerado: " + $outPath + " (municípios: " + $mapping.Keys.Count + ")")
} finally {
  $conn.Close()
  $conn.Dispose()
}

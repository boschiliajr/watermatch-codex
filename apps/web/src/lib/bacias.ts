import spMunicipioBacias from "@/data/sp-municipio-bacias.json";

export type BasinMeta = { code: string; name?: string; ugrhi?: number };

type Dataset = {
  uf: string;
  version: number;
  source: string;
  updated_at: string;
  municipios: Record<string, BasinMeta[]>;
};

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const DATASETS: Record<string, Dataset> = {
  SP: spMunicipioBacias as Dataset
};

export function resolveBasinsByMunicipio(params: { uf: string; municipio: string }): {
  bacias: BasinMeta[];
  municipio_norm: string;
  source: string;
  updated_at: string;
} {
  const uf = String(params.uf || "").toUpperCase();
  const municipio_norm = normalize(String(params.municipio || ""));
  const dataset = DATASETS[uf];

  if (!dataset || !municipio_norm) {
    return { bacias: [], municipio_norm, source: "internal", updated_at: new Date(0).toISOString() };
  }

  const bacias = dataset.municipios[municipio_norm] || [];
  return { bacias, municipio_norm, source: dataset.source, updated_at: dataset.updated_at };
}


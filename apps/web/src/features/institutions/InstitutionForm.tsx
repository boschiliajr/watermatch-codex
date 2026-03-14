"use client";

import { useMemo, useState } from "react";

type Kind = "company" | "municipality" | "government_other" | "unknown";

type LookupResponse = {
  razao_social: string;
  municipio: string;
  uf: string;
  bacia_hidrografica: string | null;
  bacias_hidrograficas?: Array<{ code: string; name?: string; ugrhi?: number }>;
  natureza_juridica?: { codigo?: string | null; descricao?: string | null } | null;
  cnae_principal?: { codigo?: string | null; descricao?: string | null } | null;
  source: "opencnpj" | "mock";
  kind: Kind;
  kind_confidence: "high" | "medium" | "low";
  kind_reason: string;
};

function cleanCnpj(cnpj: string) {
  return cnpj.replace(/\D/g, "");
}

function formatKind(kind: Kind) {
  if (kind === "company") return "Empresa";
  if (kind === "municipality") return "Prefeitura";
  if (kind === "government_other") return "Órgão Público (não prefeitura)";
  return "Indefinido";
}

export function InstitutionForm() {
  const [cnpj, setCnpj] = useState("");

  const [kind, setKind] = useState<"company" | "municipality">("company");
  const [suggestedKind, setSuggestedKind] = useState<Kind | null>(null);
  const [kindReason, setKindReason] = useState<string | null>(null);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomePrefeitura, setNomePrefeitura] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [tags, setTags] = useState("");
  const [bacias, setBacias] = useState<Array<{ code: string; name?: string; ugrhi?: number }>>([]);

  const [lookupError, setLookupError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lookupMeta, setLookupMeta] = useState<{ source: string; natureza?: string; cnae?: string } | null>(null);

  const blocked = useMemo(() => {
    // We require a successful lookup/classification before inserting.
    return suggestedKind === null || suggestedKind === "unknown" || suggestedKind === "government_other";
  }, [suggestedKind]);

  async function handleLookup() {
    const digits = cleanCnpj(cnpj);
    if (!digits) return;

    setLookupError(null);
    setStatus(null);
    setSuggestedKind(null);
    setKindReason(null);
    setLookupMeta(null);

    const res = await fetch("/api/lookup-cnpj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj: digits })
    });

    if (!res.ok) {
      setLookupError("Falha ao consultar CNPJ.");
      return;
    }

    const data = (await res.json()) as LookupResponse;
    setSuggestedKind(data.kind);
    setKindReason(data.kind_reason);
    setLookupMeta({
      source: data.source,
      natureza: data.natureza_juridica?.descricao || data.natureza_juridica?.codigo || undefined,
      cnae: data.cnae_principal?.codigo || undefined
    });

    setMunicipio(data.municipio || "");
    setUf(data.uf || "");
    setRazaoSocial(data.razao_social || "");
    setBacias(data.bacias_hidrograficas || []);

    if (data.kind === "municipality") {
      setKind("municipality");
      setNomePrefeitura((data.razao_social || `Prefeitura de ${data.municipio || ""}`).trim());
    } else if (data.kind === "company") {
      setKind("company");
      setNomePrefeitura("");
    } else {
      // unknown or government_other: keep the current selection, but block submit.
      setNomePrefeitura("");
    }

    if (data.kind === "government_other") {
      setLookupError(
        "Este CNPJ parece ser de um órgão público que não é prefeitura/município. Por enquanto, o cadastro é bloqueado."
      );
    } else if (data.kind === "unknown") {
      setLookupError("Não foi possível determinar se este CNPJ é de empresa ou prefeitura. Tente novamente.");
    } else {
      setLookupError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    if (suggestedKind === null) {
      setStatus("Consulte o CNPJ antes de cadastrar.");
      return;
    }
    if (blocked) return;

    const digits = cleanCnpj(cnpj);
    if (digits.length !== 14) {
      setStatus("CNPJ inválido (precisa ter 14 dígitos).");
      return;
    }

    const payload =
      kind === "company"
        ? {
            kind,
            cnpj: digits,
            razao_social: razaoSocial,
            municipio,
            uf,
            tags_produtos_servicos: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          }
        : {
            kind,
            cnpj: digits,
            nome_prefeitura: nomePrefeitura,
            municipio,
            uf
          };

    const res = await fetch("/api/institutions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setStatus(String(data?.error || "Falha ao cadastrar."));
      return;
    }

    setStatus(kind === "company" ? "Empresa cadastrada com sucesso." : "Prefeitura cadastrada com sucesso.");
    setCnpj("");
    setSuggestedKind(null);
    setKindReason(null);
    setRazaoSocial("");
    setNomePrefeitura("");
    setMunicipio("");
    setUf("");
    setTags("");
    setBacias([]);
    setLookupError(null);
    setLookupMeta(null);
  }

  return (
    <form className="card p-5 flex flex-col gap-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold">Cadastro de Instituição</h3>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          CNPJ
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            onBlur={handleLookup}
            placeholder="00.000.000/0000-00"
          />
        </label>

        <label className="text-sm">
          Tipo
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2 bg-white"
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            disabled={blocked}
          >
            <option value="company">Empresa</option>
            <option value="municipality">Prefeitura</option>
          </select>
        </label>
      </div>

      {suggestedKind ? (
        <p className="text-xs text-black/60">
          Sugestão do sistema: <span className="font-semibold">{formatKind(suggestedKind)}</span>
          {kindReason ? ` (${kindReason})` : null}
          {lookupMeta?.source ? ` · fonte: ${lookupMeta.source}` : null}
          {lookupMeta?.natureza ? ` · natureza: ${lookupMeta.natureza}` : null}
          {lookupMeta?.cnae ? ` · CNAE: ${lookupMeta.cnae}` : null}
        </p>
      ) : null}

      {kind === "company" ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Razão Social
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
              />
            </label>
            <label className="text-sm">
              Tags de Produtos/Serviços (separadas por vírgula)
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="T.3.1.2, drenagem, reuso"
              />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Município
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              />
            </label>
            <label className="text-sm">
              UF
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={uf} onChange={(e) => setUf(e.target.value)} />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Nome da Prefeitura
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={nomePrefeitura}
                onChange={(e) => setNomePrefeitura(e.target.value)}
              />
            </label>
            <div className="text-sm">
              <p>Bacias Hidrográficas (auto)</p>
              <div className="mt-1 min-h-[42px] rounded-xl border px-3 py-2 bg-sand flex flex-wrap gap-2 items-center">
                {bacias.length ? (
                  bacias.map((b) => (
                    <span key={b.code} className="text-xs rounded-full bg-white border px-3 py-1">
                      {b.code}
                      {b.name ? ` · ${b.name}` : ""}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-black/50">Não encontrado</span>
                )}
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Município
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
              />
            </label>
            <label className="text-sm">
              UF
              <input className="mt-1 w-full rounded-xl border px-3 py-2" value={uf} onChange={(e) => setUf(e.target.value)} />
            </label>
          </div>
        </>
      )}

      {lookupError ? <p className="text-sm text-coral">{lookupError}</p> : null}

      <button
        className="self-start rounded-full bg-ocean text-white px-5 py-2 disabled:opacity-50"
        disabled={blocked || Boolean(lookupError)}
      >
        Cadastrar
      </button>

      {status ? <p className="text-sm text-black/70">{status}</p> : null}
    </form>
  );
}

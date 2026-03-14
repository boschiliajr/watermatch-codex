"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/Toast";

type Kind = "company" | "municipality" | "government_other" | "unknown";

type Basin = { code: string; name?: string; ugrhi?: number };

type LookupResponse = {
  razao_social: string;
  municipio: string;
  uf: string;
  bacias_hidrograficas?: Basin[];
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
  if (kind === "government_other") return "Orgao publico (nao prefeitura)";
  return "Indefinido";
}

export function InstitutionForm() {
  const toast = useToast();

  const [cnpj, setCnpj] = useState("");
  const [kind, setKind] = useState<"company" | "municipality">("company");

  const [suggestedKind, setSuggestedKind] = useState<Kind | null>(null);
  const [kindReason, setKindReason] = useState<string | null>(null);
  const [lookupMeta, setLookupMeta] = useState<{ source: string; natureza?: string; cnae?: string } | null>(null);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomePrefeitura, setNomePrefeitura] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [tags, setTags] = useState("");
  const [bacias, setBacias] = useState<Basin[]>([]);

  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const blocked = useMemo(() => {
    // We require a successful lookup/classification before inserting.
    return suggestedKind === null || suggestedKind === "unknown" || suggestedKind === "government_other";
  }, [suggestedKind]);

  async function handleLookup() {
    const digits = cleanCnpj(cnpj);
    if (!digits) return;

    setLookupError(null);
    setSuggestedKind(null);
    setKindReason(null);
    setLookupMeta(null);
    setBacias([]);

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
      setNomePrefeitura("");
    }

    if (data.kind === "government_other") {
      setLookupError(
        "Este CNPJ parece ser de um orgao publico que nao e prefeitura/municipio. Por enquanto, o cadastro e bloqueado."
      );
    } else if (data.kind === "unknown") {
      setLookupError("Nao foi possivel determinar se este CNPJ e de empresa ou prefeitura. Tente novamente.");
    } else {
      setLookupError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (suggestedKind === null) {
      toast.push({ kind: "info", title: "Consulta", message: "Consulte o CNPJ antes de cadastrar." });
      return;
    }
    if (blocked) return;

    const digits = cleanCnpj(cnpj);
    if (digits.length !== 14) {
      toast.push({ kind: "error", title: "CNPJ", message: "CNPJ invalido (precisa ter 14 digitos)." });
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

    setSubmitting(true);
    try {
      const res = await fetch("/api/institutions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.push({ kind: "error", title: "Cadastro", message: String(data?.error || "Falha ao cadastrar.") });
        return;
      }

      toast.push({
        kind: "success",
        title: "Cadastro",
        message: kind === "company" ? "Empresa cadastrada com sucesso." : "Prefeitura cadastrada com sucesso."
      });

      setCnpj("");
      setSuggestedKind(null);
      setKindReason(null);
      setLookupMeta(null);
      setRazaoSocial("");
      setNomePrefeitura("");
      setMunicipio("");
      setUf("");
      setTags("");
      setBacias([]);
      setLookupError(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card p-6 flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="kicker">Cadastro</p>
          <h3 className="text-xl font-semibold">Instituicao</h3>
          <p className="text-sm text-black/60">A consulta determina o tipo e preenche dados basicos.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="field-label">
          CNPJ
          <input className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} onBlur={handleLookup} placeholder="00.000.000/0000-00" />
        </label>

        <label className="field-label">
          Tipo
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)} disabled={blocked}>
            <option value="company">Empresa</option>
            <option value="municipality">Prefeitura</option>
          </select>
        </label>
      </div>

      {suggestedKind ? (
        <p className="text-xs text-black/60">
          Sugestao do sistema: <span className="font-semibold">{formatKind(suggestedKind)}</span>
          {kindReason ? ` (${kindReason})` : null}
          {lookupMeta?.source ? ` · fonte: ${lookupMeta.source}` : null}
          {lookupMeta?.natureza ? ` · natureza: ${lookupMeta.natureza}` : null}
          {lookupMeta?.cnae ? ` · CNAE: ${lookupMeta.cnae}` : null}
        </p>
      ) : null}

      {kind === "company" ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Razao social
              <input className="input" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
            </label>
            <label className="field-label">
              Tags (separadas por virgula)
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="T.3.1.2, drenagem, reuso" />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Municipio
              <input className="input" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </label>
            <label className="field-label">
              UF
              <input className="input" value={uf} onChange={(e) => setUf(e.target.value)} />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Nome da prefeitura
              <input className="input" value={nomePrefeitura} onChange={(e) => setNomePrefeitura(e.target.value)} />
            </label>

            <div className="field-label">
              <p>Bacias (auto)</p>
              <div className="mt-1 min-h-[42px] rounded-xl border px-3 py-2 bg-[var(--surface-2)] flex flex-wrap gap-2 items-center">
                {bacias.length ? (
                  bacias.map((b) => (
                    <span key={b.code} className="text-xs rounded-full bg-white border px-3 py-1">
                      {b.code}
                      {b.name ? ` · ${b.name}` : ""}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-black/50">Nao encontrado</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Municipio
              <input className="input" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </label>
            <label className="field-label">
              UF
              <input className="input" value={uf} onChange={(e) => setUf(e.target.value)} />
            </label>
          </div>
        </>
      )}

      {lookupError ? <p className="text-sm text-coral">{lookupError}</p> : null}

      <button className="self-start btn-primary" disabled={submitting || blocked || Boolean(lookupError)}>
        {submitting ? "Cadastrando..." : "Cadastrar"}
      </button>
    </form>
  );
}


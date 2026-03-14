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
  if (kind === "government_other") return "Órgão público (não prefeitura)";
  return "Indefinido";
}

export function InstitutionForm({
  fixedKind,
  hideKindSelect,
  onSuccess
}: {
  fixedKind?: "company" | "municipality";
  hideKindSelect?: boolean;
  onSuccess?: () => void;
}) {
  const toast = useToast();

  const [cnpj, setCnpj] = useState("");
  const [kind, setKind] = useState<"company" | "municipality">(fixedKind ?? "company");

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

    const desiredKind = fixedKind ?? kind;
    if (!fixedKind) {
      if (data.kind === "municipality") {
        setKind("municipality");
      } else if (data.kind === "company") {
        setKind("company");
      }
    }

    if (data.kind === "municipality") {
      setNomePrefeitura((data.razao_social || `Prefeitura de ${data.municipio || ""}`).trim());
    } else {
      setNomePrefeitura("");
    }

    if (data.kind === "government_other") {
      setLookupError(
        "Este CNPJ parece ser de um órgão público que não é prefeitura/município. Por enquanto, o cadastro é bloqueado."
      );
      return;
    }

    if (data.kind === "unknown") {
      setLookupError("Não foi possível determinar se este CNPJ é de empresa ou prefeitura. Tente novamente.");
      return;
    }

    if (data.kind !== desiredKind) {
      setLookupError(
        data.kind === "municipality"
          ? "Este CNPJ parece ser de uma prefeitura. Use o cadastro de Prefeitura."
          : "Este CNPJ parece ser de uma empresa. Use o cadastro de Empresa."
      );
      return;
    }

    setLookupError(null);
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
      toast.push({ kind: "error", title: "CNPJ", message: "CNPJ inválido (precisa ter 14 dígitos)." });
      return;
    }

    const desiredKind = fixedKind ?? kind;
    const payload =
      desiredKind === "company"
        ? {
            kind: "company",
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
            kind: "municipality",
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
        message: desiredKind === "company" ? "Empresa cadastrada com sucesso." : "Prefeitura cadastrada com sucesso."
      });

      onSuccess?.();

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

  const showKindSelect = !hideKindSelect && !fixedKind;

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field-label">
          CNPJ
          <input
            className="input"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            onBlur={handleLookup}
            placeholder="00.000.000/0000-00"
          />
        </label>

        {showKindSelect ? (
          <label className="field-label">
            Tipo
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as any)} disabled={blocked}>
              <option value="company">Empresa</option>
              <option value="municipality">Prefeitura</option>
            </select>
          </label>
        ) : (
          <div className="field-label">
            <p>Tipo</p>
            <div className="mt-1 min-h-[42px] rounded-xl border px-3 py-2 bg-white flex items-center" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm">{fixedKind ? (fixedKind === "company" ? "Empresa" : "Prefeitura") : kind === "company" ? "Empresa" : "Prefeitura"}</span>
            </div>
          </div>
        )}
      </div>

      {suggestedKind ? (
        <p className="text-xs text-black/60">
          Sugestão do sistema: <span className="font-semibold">{formatKind(suggestedKind)}</span>
          {kindReason ? ` (${kindReason})` : null}
          {lookupMeta?.source ? ` - fonte: ${lookupMeta.source}` : null}
          {lookupMeta?.natureza ? ` - natureza: ${lookupMeta.natureza}` : null}
          {lookupMeta?.cnae ? ` - CNAE: ${lookupMeta.cnae}` : null}
        </p>
      ) : null}

      {(fixedKind ?? kind) === "company" ? (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Razão social
              <input className="input" value={razaoSocial} onChange={(e) => setRazaoSocial(e.target.value)} />
            </label>
            <label className="field-label">
              Tags (separadas por vírgula)
              <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="T.3.1.2, drenagem, reuso" />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Município
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
              <div className="mt-1 min-h-[42px] rounded-xl border px-3 py-2 bg-white flex flex-wrap gap-2 items-center" style={{ borderColor: "var(--border)" }}>
                {bacias.length ? (
                  bacias.map((b) => (
                    <span key={b.code} className="text-xs rounded-full border px-3 py-1 bg-[var(--primary-weak)] text-[var(--primary)]" style={{ borderColor: "var(--border)" }}>
                      {b.code}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-black/50">Não encontrado</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="field-label">
              Município
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


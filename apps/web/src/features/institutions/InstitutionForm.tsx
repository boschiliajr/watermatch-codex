"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/Toast";
import { apiClient } from "@/lib/apiClient";

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
  source_reliability: "high" | "low";
  requires_manual_confirmation: boolean;
  kind: Kind;
  kind_confidence: "high" | "medium" | "low";
  kind_reason: string;
};

type CreateCompanyResponse = {
  ok: true;
  source?: "opencnpj" | "mock";
  company_id?: string | null;
  enrichment_job_id?: string | null;
  enrichment_status?: string | null;
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
  const [requiresMockConfirmation, setRequiresMockConfirmation] = useState(false);
  const [mockConfirmed, setMockConfirmed] = useState(false);

  const [razaoSocial, setRazaoSocial] = useState("");
  const [nomePrefeitura, setNomePrefeitura] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [tags, setTags] = useState("");
  const [bacias, setBacias] = useState<Basin[]>([]);

  const [lookupError, setLookupError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const blocked = useMemo(() => {
    const kindBlocked = suggestedKind === null || suggestedKind === "unknown" || suggestedKind === "government_other";
    return kindBlocked || (requiresMockConfirmation && !mockConfirmed);
  }, [mockConfirmed, requiresMockConfirmation, suggestedKind]);

  async function handleLookup() {
    const digits = cleanCnpj(cnpj);
    if (!digits) return;

    setLookupError(null);
    setSuggestedKind(null);
    setKindReason(null);
    setLookupMeta(null);
    setBacias([]);
    setRequiresMockConfirmation(false);
    setMockConfirmed(false);

    try {
      const data = await apiClient<LookupResponse>("/api/lookup-cnpj", {
        method: "POST",
        body: { cnpj: digits }
      });

      setSuggestedKind(data.kind);
      setKindReason(data.kind_reason);
      setLookupMeta({
        source: data.source,
        natureza: data.natureza_juridica?.descricao || data.natureza_juridica?.codigo || undefined,
        cnae: data.cnae_principal?.codigo || undefined
      });
      setRequiresMockConfirmation(data.requires_manual_confirmation);

      setMunicipio(data.municipio || "");
      setUf(data.uf || "");
      setRazaoSocial(data.razao_social || "");
      setBacias(data.bacias_hidrograficas || []);

      const desiredKind = fixedKind ?? kind;
      if (!fixedKind) {
        if (data.kind === "municipality") setKind("municipality");
        if (data.kind === "company") setKind("company");
      }

      if (data.kind === "municipality") {
        setNomePrefeitura((data.razao_social || `Prefeitura de ${data.municipio || ""}`).trim());
      } else {
        setNomePrefeitura("");
      }

      if (data.kind === "government_other") {
        setLookupError("Este CNPJ parece ser de orgao publico que nao e prefeitura. Cadastro bloqueado.");
        return;
      }

      if (data.kind === "unknown") {
        setLookupError("Nao foi possivel determinar se este CNPJ e de empresa ou prefeitura.");
        return;
      }

      if (data.kind !== desiredKind) {
        setLookupError(
          data.kind === "municipality"
            ? "Este CNPJ parece ser de prefeitura. Use o cadastro de Prefeitura."
            : "Este CNPJ parece ser de empresa. Use o cadastro de Empresa."
        );
        return;
      }
    } catch (error) {
      setLookupError((error as Error).message || "Falha ao consultar CNPJ.");
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
    const desiredKind = fixedKind ?? kind;

    const body =
      desiredKind === "company"
        ? {
            cnpj: digits,
            razao_social: razaoSocial,
            municipio,
            uf,
            allow_mock: mockConfirmed,
            tags_produtos_servicos: tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          }
        : {
            cnpj: digits,
            nome_prefeitura: nomePrefeitura,
            municipio,
            uf,
            allow_mock: mockConfirmed
          };

    const endpoint = desiredKind === "company" ? "/api/companies" : "/api/municipalities";

    setSubmitting(true);
    try {
      const res = await apiClient<CreateCompanyResponse>(endpoint, { method: "POST", body });
      toast.push({
        kind: "success",
        title: "Cadastro",
        message:
          desiredKind === "company"
            ? `Empresa cadastrada. Enriquecimento: ${res?.enrichment_status || "nao iniciado"}.`
            : "Prefeitura cadastrada com sucesso."
      });

      onSuccess?.();
      setCnpj("");
      setSuggestedKind(null);
      setKindReason(null);
      setLookupMeta(null);
      setRequiresMockConfirmation(false);
      setMockConfirmed(false);
      setRazaoSocial("");
      setNomePrefeitura("");
      setMunicipio("");
      setUf("");
      setTags("");
      setBacias([]);
      setLookupError(null);
    } catch (error) {
      toast.push({ kind: "error", title: "Cadastro", message: (error as Error).message || "Falha ao cadastrar." });
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
          <input className="input" value={cnpj} onChange={(e) => setCnpj(e.target.value)} onBlur={handleLookup} placeholder="00.000.000/0000-00" />
        </label>

        {showKindSelect ? (
          <label className="field-label">
            Tipo
            <select className="input" value={kind} onChange={(e) => setKind(e.target.value as "company" | "municipality")} disabled={blocked}>
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
          Sugestao: <span className="font-semibold">{formatKind(suggestedKind)}</span>
          {kindReason ? ` (${kindReason})` : null}
          {lookupMeta?.source ? ` - fonte: ${lookupMeta.source}` : null}
          {lookupMeta?.natureza ? ` - natureza: ${lookupMeta.natureza}` : null}
          {lookupMeta?.cnae ? ` - CNAE: ${lookupMeta.cnae}` : null}
        </p>
      ) : null}

      {requiresMockConfirmation ? (
        <label className="text-sm flex items-center gap-2">
          <input type="checkbox" checked={mockConfirmed} onChange={(e) => setMockConfirmed(e.target.checked)} />
          Confirmo que os dados foram validados manualmente (lookup em modo mock).
        </label>
      ) : null}

      {(fixedKind ?? kind) === "company" ? (
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
              <div className="mt-1 min-h-[42px] rounded-xl border px-3 py-2 bg-white flex flex-wrap gap-2 items-center" style={{ borderColor: "var(--border)" }}>
                {bacias.length ? (
                  bacias.map((b) => (
                    <span key={b.code} className="text-xs rounded-full border px-3 py-1 bg-[var(--primary-weak)] text-[var(--primary)]" style={{ borderColor: "var(--border)" }}>
                      {b.code}
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

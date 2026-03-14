"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function CompanyForm() {
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [tags, setTags] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  async function handleLookup() {
    if (!cnpj) return;
    setLookupError(null);
    const res = await fetch("/api/lookup-cnpj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj })
    });

    if (!res.ok) return;
    const data = await res.json();
    const razao = data.razao_social || "";
    const municipioLookup = data.municipio || "";
    const ufLookup = data.uf || "";

    if (razao.toLowerCase().includes("prefeitura")) {
      setLookupError("Este CNPJ parece ser de uma prefeitura. Use o cadastro de Prefeituras.");
      setRazaoSocial("");
      setMunicipio("");
      setUf("");
      return;
    }

    setRazaoSocial(razao);
    setMunicipio(municipioLookup);
    setUf(ufLookup);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (lookupError) return;

    const { error } = await supabaseBrowser.from("companies").insert({
      cnpj,
      razao_social: razaoSocial,
      municipio,
      uf,
      tags_produtos_servicos: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Empresa cadastrada com sucesso.");
    setCnpj("");
    setRazaoSocial("");
    setMunicipio("");
    setUf("");
    setTags("");
  }

  return (
    <form className="card p-5 flex flex-col gap-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold">Cadastro de Empresa</h3>
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
          Razão Social
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
          />
        </label>
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
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          />
        </label>
      </div>
      <label className="text-sm">
        Tags de Produtos/Serviços (separadas por vírgula)
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="T.3.1.2, drenagem, reuso"
        />
      </label>
      {lookupError ? <p className="text-sm text-coral">{lookupError}</p> : null}
      <button
        className="self-start rounded-full bg-ocean text-white px-5 py-2 disabled:opacity-50"
        disabled={Boolean(lookupError)}
      >
        Cadastrar
      </button>
      {status ? <p className="text-sm text-black/70">{status}</p> : null}
    </form>
  );
}

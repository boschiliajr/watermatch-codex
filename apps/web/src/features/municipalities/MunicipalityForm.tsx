"use client";

import { useState } from "react";
import { apiClient } from "@/lib/apiClient";

export function MunicipalityForm() {
  const [cnpj, setCnpj] = useState("");
  const [nomePrefeitura, setNomePrefeitura] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [bacia, setBacia] = useState("");
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
    const baciaLookup = data.bacia_hidrografica || "";

    if (!razao.toLowerCase().includes("prefeitura")) {
      setLookupError("Este CNPJ parece ser de uma empresa. Use o cadastro de Empresas.");
      setNomePrefeitura("");
      setMunicipio("");
      setUf("");
      setBacia("");
      return;
    }

    setNomePrefeitura(`Prefeitura de ${municipioLookup}`.trim());
    setMunicipio(municipioLookup);
    setUf(ufLookup);
    setBacia(baciaLookup);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (lookupError) return;

    try {
      await apiClient("/api/municipalities", {
        method: "POST",
        body: {
          cnpj,
          nome_prefeitura: nomePrefeitura,
          municipio,
          uf,
          allow_mock: true
        }
      });
    } catch (error) {
      setStatus((error as Error).message);
      return;
    }

    setStatus("Prefeitura cadastrada com sucesso.");
    setCnpj("");
    setNomePrefeitura("");
    setMunicipio("");
    setUf("");
    setBacia("");
  }

  return (
    <form className="card p-5 flex flex-col gap-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold">Cadastro de Prefeitura</h3>
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
          Nome da Prefeitura
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={nomePrefeitura}
            onChange={(e) => setNomePrefeitura(e.target.value)}
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
        Bacia Hidrográfica
        <input
          className="mt-1 w-full rounded-xl border px-3 py-2"
          value={bacia}
          onChange={(e) => setBacia(e.target.value)}
          placeholder="CBH-PS"
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

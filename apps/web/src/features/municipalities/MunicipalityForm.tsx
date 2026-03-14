"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function MunicipalityForm() {
  const [cnpj, setCnpj] = useState("");
  const [nomePrefeitura, setNomePrefeitura] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [uf, setUf] = useState("");
  const [bacia, setBacia] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  async function handleLookup() {
    if (!cnpj) return;
    const res = await fetch("/api/lookup-cnpj", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cnpj })
    });

    if (!res.ok) return;
    const data = await res.json();
    setNomePrefeitura(`Prefeitura de ${data.municipio || ""}`.trim());
    setMunicipio(data.municipio || "");
    setUf(data.uf || "");
    setBacia(data.bacia_hidrografica || "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const { error } = await supabaseBrowser.from("municipalities").insert({
      cnpj,
      nome_prefeitura: nomePrefeitura,
      municipio,
      uf,
      bacia_hidrografica: bacia
    });

    if (error) {
      setStatus(error.message);
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
      <button className="self-start rounded-full bg-ocean text-white px-5 py-2">Cadastrar</button>
      {status ? <p className="text-sm text-black/70">{status}</p> : null}
    </form>
  );
}

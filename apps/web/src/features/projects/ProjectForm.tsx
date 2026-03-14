"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export function ProjectForm() {
  const [matchId, setMatchId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [custo, setCusto] = useState("0");
  const [margem, setMargem] = useState("0");
  const [status, setStatus] = useState<string | null>(null);

  const total = useMemo(() => {
    const custoNum = Number(custo) || 0;
    const margemNum = Number(margem) || 0;
    return custoNum + custoNum * (margemNum / 100);
  }, [custo, margem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);

    const { error } = await supabaseBrowser.from("projects").insert({
      match_id: matchId,
      titulo,
      resumo,
      valor_custo_empresa: Number(custo),
      margem_pit_percentual: Number(margem)
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    setStatus("Projeto criado com sucesso.");
    setMatchId("");
    setTitulo("");
    setResumo("");
    setCusto("0");
    setMargem("0");
  }

  return (
    <form className="card p-5 flex flex-col gap-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold">Criar Projeto</h3>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          Match ID
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Título
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </label>
      </div>
      <label className="text-sm">
        Resumo
        <textarea
          className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[90px]"
          value={resumo}
          onChange={(e) => setResumo(e.target.value)}
        />
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm">
          Custo Empresa
          <input
            type="number"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={custo}
            onChange={(e) => setCusto(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Margem PIT (%)
          <input
            type="number"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={margem}
            onChange={(e) => setMargem(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Valor Total (auto)
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2 bg-sand"
            value={total.toFixed(2)}
            readOnly
          />
        </label>
      </div>
      <button className="self-start rounded-full bg-ocean text-white px-5 py-2">Salvar Projeto</button>
      {status ? <p className="text-sm text-black/70">{status}</p> : null}
    </form>
  );
}

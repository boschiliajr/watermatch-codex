"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useToast } from "@/components/Toast";

export function ProjectForm() {
  const toast = useToast();

  const [matchId, setMatchId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [custo, setCusto] = useState("0");
  const [margem, setMargem] = useState("0");

  const total = useMemo(() => {
    const custoNum = Number(custo) || 0;
    const margemNum = Number(margem) || 0;
    return custoNum + custoNum * (margemNum / 100);
  }, [custo, margem]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabaseBrowser.from("projects").insert({
      match_id: matchId,
      titulo,
      resumo,
      valor_custo_empresa: Number(custo),
      margem_pit_percentual: Number(margem)
    });

    if (error) {
      toast.push({ kind: "error", title: "Projeto", message: error.message });
      return;
    }

    toast.push({ kind: "success", title: "Projeto", message: "Projeto criado com sucesso." });
    setMatchId("");
    setTitulo("");
    setResumo("");
    setCusto("0");
    setMargem("0");
  }

  return (
    <form className="card p-6 flex flex-col gap-5" onSubmit={handleSubmit}>
      <div>
        <p className="kicker">Criacao</p>
        <h3 className="text-xl font-semibold">Projeto</h3>
        <p className="text-sm text-black/60">Registre o projeto a partir de um match.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="field-label">
          Match ID
          <input className="input" value={matchId} onChange={(e) => setMatchId(e.target.value)} />
        </label>
        <label className="field-label">
          Título
          <input className="input" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </label>
      </div>

      <label className="field-label">
        Resumo
        <textarea className="input min-h-[90px]" value={resumo} onChange={(e) => setResumo(e.target.value)} />
      </label>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="field-label">
          Custo empresa
          <input type="number" className="input" value={custo} onChange={(e) => setCusto(e.target.value)} />
        </label>
        <label className="field-label">
          Margem PIT (%)
          <input type="number" className="input" value={margem} onChange={(e) => setMargem(e.target.value)} />
        </label>
        <label className="field-label">
          Valor total (auto)
          <input className="input bg-[var(--surface-2)]" value={total.toFixed(2)} readOnly />
        </label>
      </div>

      <button className="self-start btn-primary">Salvar projeto</button>
    </form>
  );
}

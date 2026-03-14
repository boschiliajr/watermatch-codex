"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useToast } from "@/components/Toast";
import { suggestTipologia } from "@watertech/shared";

type MunicipalityOption = { id: string; municipio: string; uf: string };

export function DemandForm({ onSuccess }: { onSuccess?: () => void }) {
  const toast = useToast();
  const [municipalities, setMunicipalities] = useState<MunicipalityOption[]>([]);
  const [municipalityId, setMunicipalityId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabaseBrowser
        .from("municipalities")
        .select("id, municipio, uf")
        .order("municipio", { ascending: true });
      if (error) {
        toast.push({ kind: "error", title: "Prefeituras", message: error.message });
        return;
      }
      setMunicipalities((data as any) || []);
    })();
  }, [toast]);

  const tipologia = useMemo(() => {
    const s = suggestTipologia(descricao);
    return s?.tipologiaCodigo ?? null;
  }, [descricao]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!municipalityId) {
      toast.push({ kind: "error", title: "Demanda", message: "Selecione uma prefeitura." });
      return;
    }
    if (!descricao.trim()) {
      toast.push({ kind: "error", title: "Demanda", message: "Descreva o problema." });
      return;
    }

    setSubmitting(true);
    try {
      let tipologiaId: string | null = null;
      if (tipologia) {
        const { data } = await supabaseBrowser
          .from("fehidro_dictionary")
          .select("id")
          .eq("tipologia_codigo", tipologia)
          .limit(1)
          .maybeSingle();
        tipologiaId = (data as any)?.id ?? null;
      }

      const { error } = await supabaseBrowser.from("demands").insert({
        municipality_id: municipalityId,
        descricao_problema: descricao.trim(),
        tipologia_sugerida: tipologiaId,
        status: "open"
      });

      if (error) {
        toast.push({ kind: "error", title: "Demanda", message: error.message });
        return;
      }

      toast.push({ kind: "success", title: "Demanda", message: "Demanda criada com sucesso." });
      setMunicipalityId("");
      setDescricao("");
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field-label">
          Prefeitura
          <select className="input" value={municipalityId} onChange={(e) => setMunicipalityId(e.target.value)}>
            <option value="">Selecione...</option>
            {municipalities.map((m) => (
              <option key={m.id} value={m.id}>
                {m.municipio} - {m.uf}
              </option>
            ))}
          </select>
        </label>

        <div className="field-label">
          <p>Tipologia sugerida</p>
          <div
            className="mt-1 min-h-[42px] rounded-xl border px-3 py-2 bg-white flex items-center"
            style={{ borderColor: "var(--border)" }}
          >
            {tipologia ? <span className="chip chip-primary">{tipologia}</span> : <span className="text-sm text-black/50">Sem sugestão</span>}
          </div>
        </div>
      </div>

      <label className="field-label">
        Descrição do problema
        <textarea className="input min-h-[110px]" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </label>

      <button className="self-start btn-primary" disabled={submitting}>
        {submitting ? "Criando..." : "Criar demanda"}
      </button>
    </form>
  );
}


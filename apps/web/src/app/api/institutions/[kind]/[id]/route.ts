import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function DELETE(_req: NextRequest, ctx: { params: { kind: string; id: string } }) {
  const { kind, id } = ctx.params;

  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  if (kind === "company") {
    const { error } = await supabaseServer.from("companies").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (kind === "municipality") {
    const { error } = await supabaseServer.from("municipalities").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
}

import { supabaseServer } from "@/lib/supabaseServer";
import { StatCard } from "./StatCard";

export async function StatsCards() {
  const [companies, municipalities, demands, projects] = await Promise.all([
    supabaseServer.from("companies").select("id", { count: "exact", head: true }),
    supabaseServer.from("municipalities").select("id", { count: "exact", head: true }),
    supabaseServer.from("demands").select("id", { count: "exact", head: true }),
    supabaseServer.from("projects").select("id", { count: "exact", head: true })
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard title="Empresas" value={String(companies.count ?? 0)} accent="bg-mint/60" />
      <StatCard title="Prefeituras" value={String(municipalities.count ?? 0)} accent="bg-tide/40" />
      <StatCard title="Demandas" value={String(demands.count ?? 0)} accent="bg-coral/20" />
      <StatCard title="Projetos" value={String(projects.count ?? 0)} accent="bg-ocean/20" />
    </div>
  );
}

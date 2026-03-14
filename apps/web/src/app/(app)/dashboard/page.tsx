import { StatsCards } from "@/components/StatsCards";

export default function DashboardPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="kicker">Painel</p>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">Visao geral do WaterTech Match PIT.</p>
        </div>
      </header>

      <section className="grid gap-6">
        <StatsCards />
      </section>
    </div>
  );
}


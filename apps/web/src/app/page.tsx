import { Sidebar } from "@/components/Sidebar";
import { StatsCards } from "@/components/StatsCards";
import { InstitutionForm } from "@/features/institutions/InstitutionForm";
import { ProjectForm } from "@/features/projects/ProjectForm";
import { CompaniesTable } from "@/features/tables/CompaniesTable";
import { DemandsTable } from "@/features/tables/DemandsTable";
import { MunicipalitiesTable } from "@/features/tables/MunicipalitiesTable";
import { ProjectsTable } from "@/features/tables/ProjectsTable";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sand via-white to-mint/40 p-6">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <Sidebar />
        <main className="flex flex-col gap-8">
          <section id="dashboard" className="flex flex-col gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-black/40">Painel</p>
              <h2 className="text-3xl font-semibold">WaterTech Match PIT</h2>
            </div>
            <StatsCards />
          </section>

          <section id="cadastros" className="grid gap-6 lg:grid-cols-2">
            <InstitutionForm />
          </section>

          <section id="projetos" className="grid gap-6">
            <ProjectForm />
          </section>

          <section id="tabelas" className="grid gap-6">
            <CompaniesTable />
            <MunicipalitiesTable />
            <DemandsTable />
            <ProjectsTable />
          </section>
        </main>
      </div>
    </div>
  );
}

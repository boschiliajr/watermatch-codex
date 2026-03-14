import { CompaniesTable } from "@/features/tables/CompaniesTable";
import { DemandsTable } from "@/features/tables/DemandsTable";
import { MunicipalitiesTable } from "@/features/tables/MunicipalitiesTable";
import { ProjectsTable } from "@/features/tables/ProjectsTable";

export default function TabelasPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="kicker">Dados</p>
          <h2 className="page-title">Tabelas</h2>
          <p className="page-subtitle">Consulte e gerencie os registros do prototipo.</p>
        </div>
      </header>

      <section className="grid gap-6">
        <CompaniesTable />
        <MunicipalitiesTable />
        <DemandsTable />
        <ProjectsTable />
      </section>
    </div>
  );
}


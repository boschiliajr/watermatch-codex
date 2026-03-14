import { ProjectForm } from "@/features/projects/ProjectForm";

export default function ProjetosPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="kicker">Projetos</p>
          <h2 className="page-title">FEHIDRO</h2>
          <p className="page-subtitle">Crie e registre projetos a partir dos matches.</p>
        </div>
      </header>

      <section className="grid gap-6">
        <ProjectForm />
      </section>
    </div>
  );
}


import { InstitutionForm } from "@/features/institutions/InstitutionForm";

export default function CadastrosPage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="kicker">Cadastros</p>
          <h2 className="page-title">Instituicoes</h2>
          <p className="page-subtitle">Cadastre empresas e prefeituras com validacao automatica.</p>
        </div>
      </header>

      <section className="grid gap-6">
        <InstitutionForm />
      </section>
    </div>
  );
}


export function Sidebar() {
  return (
    <aside className="flex h-full flex-col gap-6 bg-ink text-white p-6 rounded-3xl">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-white/60">WaterTech</p>
        <h1 className="text-2xl font-semibold">Match PIT</h1>
      </div>
      <nav className="flex flex-col gap-3 text-sm">
        <a href="#dashboard" className="hover:text-mint">Dashboard</a>
        <a href="#cadastros" className="hover:text-mint">Cadastros</a>
        <a href="#tabelas" className="hover:text-mint">Tabelas</a>
        <a href="#projetos" className="hover:text-mint">Projetos</a>
      </nav>
      <div className="mt-auto text-xs text-white/60">
        B2B para FEHIDRO
      </div>
    </aside>
  );
}

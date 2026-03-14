export function StatCard({ title, value, accent }: { title: string; value: string; accent: string }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="text-xs uppercase tracking-[0.2em] text-black/50">{title}</div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-semibold text-ink">{value}</span>
        <span className={`text-xs px-2 py-1 rounded-full ${accent}`}>Atualizado</span>
      </div>
    </div>
  );
}

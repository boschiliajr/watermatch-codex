"use client";

export function DeleteConfirmModal({
  open,
  title,
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="card max-w-md w-full p-6">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-black/60 mb-6">
          Tem a certeza que deseja eliminar? Esta ação apagará também todos os registos associados.
        </p>
        <div className="flex gap-3 justify-end">
          <button className="px-4 py-2 rounded-full border" onClick={onCancel}>
            Cancelar
          </button>
          <button className="px-4 py-2 rounded-full bg-coral text-white" onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import ModalShell from "./ModalShell";
import { TrashIcon } from "./icons";

type Props = {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  title,
  message,
  confirmLabel = "Hapus",
  busyLabel = "Menghapus...",
  busy,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ModalShell
      role="alertdialog"
      layer="z-[55]"
      labelledBy="confirm-title"
      describedBy="confirm-desc"
      onClose={() => {
        if (!busy) onCancel();
      }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <TrashIcon className="h-6 w-6" />
      </div>
      <h2 id="confirm-title" className="mt-4 text-lg font-semibold">
        {title}
      </h2>
      <div id="confirm-desc" className="mt-1 text-sm text-slate-500">
        {message}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="flex-1 cursor-pointer rounded-2xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}
import type { Participant } from "./types";
import { TrashIcon } from "./icons";

type Props = {
  participant: Participant;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function DeleteParticipantModal({
  participant,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={() => {
        if (!busy) onCancel();
      }}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="del-title"
        aria-describedby="del-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <TrashIcon className="h-6 w-6" />
        </div>
        <h2 id="del-title" className="mt-4 text-lg font-semibold">
          Hapus peserta?
        </h2>
        <p id="del-desc" className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">&quot;{participant.name}&quot;</span> beserta seluruh
          riwayat absensinya akan dihapus permanen. Tindakan ini tidak dapat diurungkan.
        </p>

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
            {busy ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
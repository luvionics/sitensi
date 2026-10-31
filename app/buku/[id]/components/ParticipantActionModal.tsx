import type { Participant } from "./types";
import { STATUSES, STATUS_DOT, STATUS_LABEL, type Status } from "./status";
import ModalShell from "./ModalShell";
import { PencilIcon, TrashIcon, XIcon } from "./icons";

type Props = {
  participant: Participant;
  /** null = sedang dimuat */
  counts: Record<Status, number> | null;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  onClose: () => void;
};

export default function ParticipantActionModal({
  participant,
  counts,
  onEdit,
  onDelete,
  onViewDetail,
  onClose,
}: Props) {
  const total = counts ? STATUSES.reduce((sum, s) => sum + counts[s], 0) : 0;

  return (
    <ModalShell onClose={onClose} labelledBy="action-title" panelClassName="max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="action-title" className="truncate text-lg font-semibold">
            {participant.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <XIcon />
        </button>
      </div>

      {/* Total status */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium text-slate-700">Total kehadiran</p>
          {counts && <p className="text-xs text-slate-500">{total} hari tercatat</p>}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-2">
          {STATUSES.map((s) => (
            <div
              key={s}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 px-2 py-3"
            >
              {counts ? (
                <span className="text-xl font-semibold text-slate-900">{counts[s]}</span>
              ) : (
                <span className="h-7 w-8 animate-pulse rounded bg-slate-100" />
              )}
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Data lengkap peserta */}
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onViewDetail}
        className="mt-5 w-full rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Lihat data lengkap
      </button>

      {/* Edit */}
      <button
        type="button"
        onClick={onEdit}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <PencilIcon className="h-4 w-4" />
        Edit peserta
      </button>

      {/* Hapus (paling bawah) */}
      <div className="mt-5 border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-red-200 py-3 text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <TrashIcon className="h-4 w-4" />
          Hapus peserta
        </button>
      </div>
    </ModalShell>
  );
}
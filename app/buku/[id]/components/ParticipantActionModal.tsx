import type { Participant } from "./types";
import { STATUSES, STATUS_DOT, STATUS_LABEL, type Status } from "./status";
import ModalShell from "./ModalShell";
import { EyeIcon, PencilIcon, ShareIcon, TrashIcon, XIcon, DocumentIcon } from "./icons";
import ActionItem from "./ActionItem";

type Props = {
  participant: Participant;
  /** null = sedang dimuat */
  counts: Record<Status, number> | null;
  onEdit: () => void;
  onDelete: () => void;
  onViewDetail: () => void;
  onViewRecap: () => void;
  onShare: () => void;
  onClose: () => void;
};

export default function ParticipantActionModal({
  participant,
  counts,
  onEdit,
  onDelete,
  onViewDetail,
  onViewRecap,
  onShare,
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

      <div className="mt-5 space-y-2">
        <ActionItem icon={<EyeIcon className="h-5 w-5" />} title="Lihat data lengkap" description="Lihat semua data dan riwayat kehadiran peserta." onClick={onViewDetail} />
        <ActionItem icon={<PencilIcon className="h-5 w-5" />} title="Edit peserta" description="Ubah nama, email, dan data peserta." onClick={onEdit} />
        <ActionItem icon={<DocumentIcon className="h-5 w-5" />} title="Lihat rekap" description="Lihat ringkasan, kalender, dan riwayat kehadiran." onClick={onViewRecap} />
        <ActionItem icon={<ShareIcon className="h-5 w-5" />} title="Bagikan rekap absensi" description="Kirim lewat email atau salin tautan rekap peserta ini." onClick={onShare} />
      </div>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <ActionItem icon={<TrashIcon className="h-5 w-5" />} title="Hapus peserta" description="Hapus peserta beserta seluruh riwayat absensinya." onClick={onDelete} danger />
      </div>
    </ModalShell>
  );
}
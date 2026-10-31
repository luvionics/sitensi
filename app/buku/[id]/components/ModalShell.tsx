import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: "dialog" | "alertdialog";
  /** Kelas z-index overlay (default z-50) */
  layer?: string;
  /** Kelas tambahan untuk panel, misalnya overflow-y-auto */
  panelClassName?: string;
};

export default function ModalShell({
  children,
  onClose,
  labelledBy,
  describedBy,
  role = "dialog",
  layer = "z-50",
  panelClassName = "",
}: Props) {
  return (
    <div
      className={`fixed inset-0 ${layer} flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4`}
      onClick={onClose}
      role="presentation"
    >
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-3xl bg-white px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:max-h-[90vh] sm:max-w-md sm:rounded-3xl sm:p-6 ${panelClassName}`}
      >
        {/* Garis pegangan, hanya di mobile */}
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
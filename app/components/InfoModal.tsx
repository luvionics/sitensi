"use client";

import { useEffect, useRef } from "react";

type IconProps = { className?: string };

function Svg({ className, children, w = 1.8 }: IconProps & { children: React.ReactNode; w?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const InfoIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={2}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </Svg>
);
const CloseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={2}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);
const CheckCircleIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </Svg>
);
const BookIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="m9 11 2 2 4-4" />
  </Svg>
);
const FolderIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </Svg>
);
const MoveIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    <path d="M9 13h6" />
    <path d="m13 10 3 3-3 3" />
  </Svg>
);
const TrashIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <path d="M4 7h16" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
  </Svg>
);

const INFO_ITEMS: {
  title: string;
  text: string;
  icon: (p: IconProps) => React.ReactElement;
  gradient: string;
}[] = [
  {
    title: "Apa itu Sitensi?",
    text: "Sitensi adalah aplikasi absensi digital. Catat kehadiran peserta per buku, lalu lihat rekapnya kapan saja.",
    icon: CheckCircleIcon,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    title: "Buku absensi",
    text: "Satu buku untuk satu kelas atau kegiatan. Ketuk buku untuk membukanya, lalu kelola peserta dan lihat rekap kehadiran.",
    icon: BookIcon,
    gradient: "from-sky-500 to-blue-600",
  },
  {
    title: "Folder",
    text: "Kelompokkan beberapa buku dalam satu folder. Folder juga bisa berisi subfolder.",
    icon: FolderIcon,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    title: "Memindahkan",
    text: "Di komputer, seret kartu ke folder atau ke lokasi di atas daftar. Di semua perangkat, ketuk titik tiga lalu pilih Pindahkan. Sesaat setelah memindahkan, ketuk Urungkan untuk membatalkan.",
    icon: MoveIcon,
    gradient: "from-sky-500 to-blue-600",
  },
  {
    title: "Menghapus",
    text: "Ketuk titik tiga lalu pilih Hapus. Menghapus folder ikut menghapus semua isinya secara permanen.",
    icon: TrashIcon,
    gradient: "from-red-500 to-red-600",
  },
];

const INFO_MODAL_CSS = `
.im-fade{animation:im-fade .2s ease-out both}
@keyframes im-fade{from{opacity:0}to{opacity:1}}
.im-sheet{animation:im-up .3s cubic-bezier(.2,.8,.2,1) both}
@keyframes im-up{from{transform:translateY(100%)}to{transform:none}}
@keyframes im-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@media (min-width:640px){.im-sheet{animation:im-pop .3s cubic-bezier(.2,.9,.3,1.2) both}}
.im-item{animation:im-pop .3s cubic-bezier(.2,.9,.3,1.2) backwards}
@media (prefers-reduced-motion: reduce){.im-fade,.im-sheet,.im-item{animation:none}}
`;

type Props = {
  /** Tampilkan modal atau tidak */
  open: boolean;
  /** Dipanggil saat modal ditutup (tombol tutup, Mengerti, klik luar, atau Esc) */
  onClose: () => void;
};

/** Modal informasi cara memakai Sitensi (bottom sheet di mobile, di tengah pada layar lebar). */
export default function InfoModal({ open, onClose }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Esc menutup, scroll halaman dikunci, fokus dipindah lalu dikembalikan
  useEffect(() => {
    if (!open) return;

    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="im-fade fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <style>{INFO_MODAL_CSS}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="info-title"
        onClick={(e) => e.stopPropagation()}
        className="im-sheet relative flex max-h-[90dvh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-w-lg sm:rounded-[2rem]"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-700 to-blue-900 px-6 pb-7 pt-3 text-white sm:pt-6">
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-white/10"
          />

          {/* Garis pegangan (hanya mobile) */}
          <span
            aria-hidden="true"
            className="relative mx-auto mb-4 block h-1.5 w-12 rounded-full bg-white/40 sm:hidden"
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                <InfoIcon className="h-7 w-7" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Sitensi</p>
                <h2 id="info-title" className="mt-0.5 truncate text-xl font-bold leading-tight sm:text-2xl">
                  Informasi
                </h2>
              </div>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={onClose}
              aria-label="Tutup informasi"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Isi */}
        <div className="flex-1 overflow-y-auto bg-slate-50 px-5 py-5">
          <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Cara memakai
          </p>
          <ul className="space-y-3">
            {INFO_ITEMS.map((it, i) => {
              const Icon = it.icon;
              return (
                <li
                  key={it.title}
                  className="im-item flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  style={{ animationDelay: `${80 + i * 50}ms` }}
                >
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${it.gradient} text-white shadow-md shadow-blue-600/20`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900">{it.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{it.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div
          className="border-t border-slate-200 bg-white px-5 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.875rem)" }}
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-full bg-gradient-to-r from-blue-500 to-blue-700 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
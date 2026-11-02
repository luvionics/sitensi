"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type IconProps = { className?: string };

function Svg({ className, children, w = 2 }: IconProps & { children: React.ReactNode; w?: number }) {
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

const ChevronRight = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="m9 18 6-6-6-6" /></Svg>
);
const UserPlusIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </Svg>
);
const ChartIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M5 20V11M12 20V4M19 20v-6" />
  </Svg>
);
const CloseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><path d="M18 6 6 18M6 6l12 12" /></Svg>
);
const GearIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
const BookIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
    <path d="M4 5.5v16" />
    <path d="M9 8h6" />
  </Svg>
);

type Tone = "blue" | "emerald" | "amber" | "violet";

const TONES: Record<Tone, { icon: string; hover: string; text: string }> = {
  blue: {
    icon: "bg-blue-50 text-blue-600 border-blue-100",
    hover: "hover:border-blue-200 hover:bg-blue-50/60",
    text: "group-hover:text-blue-700",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700 border-emerald-100",
    hover: "hover:border-emerald-200 hover:bg-emerald-50/60",
    text: "group-hover:text-emerald-700",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700 border-amber-100",
    hover: "hover:border-amber-200 hover:bg-amber-50/60",
    text: "group-hover:text-amber-700",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700 border-violet-100",
    hover: "hover:border-violet-200 hover:bg-violet-50/60",
    text: "group-hover:text-violet-700",
  },
};

// Rute halaman kelola peserta (dipakai tombol "Kelola" dan menu modal)
const pesertaHref = (id: string) => `/buku/${id}/peserta`;

// Menu modal: ubah path sesuai struktur halaman Anda
const MENU: {
  label: string;
  description: string;
  icon: (p: IconProps) => React.ReactElement;
  tone: Tone;
  href: (bookId: string) => string;
}[] = [
  {
    label: "Kelola peserta",
    description: "Tambah dan atur peserta",
    icon: UserPlusIcon,
    tone: "blue",
    href: pesertaHref,
  },
  {
    label: "Rekapitulasi",
    description: "Rekap kehadiran seluruh peserta",
    icon: ChartIcon,
    tone: "emerald",
    href: (id) => `/buku/${id}/rekap`,
  },
];

const SIDEBAR_CSS = `
.bs-pop{animation:bs-pop .3s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes bs-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.bs-item{animation:bs-item .3s ease-out both}
@keyframes bs-item{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.bs-pop,.bs-item{animation:none}}
`;

type Props = {
  /** ID buku, dipakai untuk membentuk rute menu */
  bookId: string;
  /** Judul yang tampil di bagian atas modal */
  title?: string;
  /** Sembunyikan tombol Kelola dan gerigi (mis. saat bar simpan tampil) */
  hideTrigger?: boolean;
  /** Dipanggil sebelum pindah halaman; kembalikan false untuk membatalkan */
  confirmLeave?: () => boolean;
};

export default function BukuSidebar({ bookId, title, hideTrigger = false, confirmLeave }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Escape menutup modal
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Kunci scroll halaman saat terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fokus: ke tombol tutup saat dibuka, kembali ke tombol gerigi saat ditutup
  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
      wasOpen.current = true;
      return () => window.clearTimeout(t);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  function navigate(href: string) {
    if (confirmLeave && !confirmLeave()) return;
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <style>{SIDEBAR_CSS}</style>

      {/* Tombol Kelola + gerigi melayang di pojok kanan atas */}
      {!hideTrigger && (
        <div
          style={{ top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)" }}
          className="bs-pop fixed right-4 z-30 flex items-center gap-1 sm:right-6"
        >
          <button
            type="button"
            onClick={() => navigate(pesertaHref(bookId))}
            aria-label="Kelola peserta"
            className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95"
          >
            <UserPlusIcon className="h-[18px] w-[18px]" />
            <span>Kelola</span>
          </button>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-transparent text-blue-600 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-90"
          >
            <GearIcon className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Overlay + modal */}
      <div
        className={`fixed inset-0 z-40 flex items-end justify-center sm:items-center sm:p-4 ${
          open ? "" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        <div
          onClick={close}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`relative flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-all duration-300 ease-out sm:max-w-md sm:rounded-3xl ${
            open
              ? "translate-y-0 sm:scale-100 sm:opacity-100"
              : "translate-y-full sm:translate-y-0 sm:scale-95 sm:opacity-0"
          }`}
        >
          {/* Header */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 px-5 pb-5 pt-3 text-white sm:pt-5">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 right-10 h-20 w-20 rounded-full bg-white/10"
            />

            {/* Garis pegangan (hanya mobile) */}
            <span
              aria-hidden="true"
              className="relative mx-auto mb-3 block h-1 w-10 rounded-full bg-white/40 sm:hidden"
            />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                  <BookIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-blue-100">Menu buku</p>
                  <h2 className="truncate text-base font-semibold leading-tight">{title || "Buku"}</h2>
                </div>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={close}
                aria-label="Tutup menu"
                tabIndex={open ? 0 : -1}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Daftar menu */}
          <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Navigasi buku">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Menu</p>
            <ul className="space-y-2">
              {MENU.map((m, i) => {
                const tone = TONES[m.tone];
                const Icon = m.icon;
                return (
                  <li key={m.label} className={open ? "bs-item" : ""} style={{ animationDelay: `${80 + i * 50}ms` }}>
                    <button
                      type="button"
                      onClick={() => navigate(m.href(bookId))}
                      tabIndex={open ? 0 : -1}
                      className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${tone.hover}`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${tone.icon}`}
                      >
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-medium text-slate-800 ${tone.text}`}>
                          {m.label}
                        </span>
                        <span className="block truncate text-xs text-slate-500">{m.description}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div
            className="border-t border-slate-100 px-5 pt-3"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
          >
            <p className="text-center text-[11px] text-slate-400">Ketuk di luar panel atau tekan Esc untuk menutup</p>
          </div>
        </div>
      </div>
    </>
  );
}
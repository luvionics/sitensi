"use client";

import Link from "next/link";

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

const BookIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="m9 11 2 2 4-4" />
  </Svg>
);
const UserPlusIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={2}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M19 8v6M22 11h-6" />
  </Svg>
);
const ChartIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <path d="M5 20V11M12 20V4M19 20v-6" />
  </Svg>
);
const ArrowRightIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);

const STEPS: {
  label: string;
  description: string;
  icon: (p: IconProps) => React.ReactElement;
  gradient: string;
}[] = [
  {
    label: "Masuk atau daftar",
    description: "Gunakan akun Anda untuk mulai membuat buku absen.",
    icon: UserPlusIcon,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    label: "Buat buku absen",
    description: "Satu buku untuk satu kelas atau kegiatan.",
    icon: BookIcon,
    gradient: "from-sky-500 to-blue-600",
  },
  {
    label: "Catat kehadiran",
    description: "Tambah peserta, catat kehadiran, lalu lihat rekapnya.",
    icon: ChartIcon,
    gradient: "from-blue-500 to-blue-700",
  },
];

const ANON_CSS = `
.fa-pop{animation:fa-pop .3s cubic-bezier(.2,.9,.3,1.2) backwards}
@keyframes fa-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.fa-pop{animation:none}}
`;

/** Pemberitahuan dan arahan untuk pengguna yang belum login. */
export default function ForAnon() {
  return (
    <section
      aria-label="Selamat datang di Sitensi"
      className="fa-pop mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <style>{ANON_CSS}</style>

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-700 to-blue-900 px-6 py-8 text-white sm:px-8 sm:py-10">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-white/10"
        />

        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-white/15 ring-1 ring-white/30">
            <BookIcon className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Belum masuk</p>
            <h2 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">Selamat datang di Sitensi</h2>
            <p className="mt-2 max-w-md text-sm text-blue-100 sm:text-base">
              Masuk untuk membuat buku absen dan mulai mencatat kehadiran secara digital.
            </p>
          </div>
        </div>
      </div>

      {/* Langkah awal + ajakan masuk */}
      <div className="bg-slate-50 px-5 py-6 sm:px-8">
        <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Mulai dalam 3 langkah
        </p>

        <ol className="grid gap-3 sm:grid-cols-3">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li
                key={s.label}
                className="fa-pop flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-col sm:items-start sm:gap-3"
                style={{ animationDelay: `${120 + i * 60}ms` }}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-md shadow-blue-600/20`}
                >
                  <Icon />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                    Langkah {i + 1}
                  </p>
                  <p className="mt-0.5 text-base font-semibold text-slate-900">{s.label}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{s.description}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex w-fit items-center rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
            Gratis 2 Buku
          </span>
          <Link
            href="/login"
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-6 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95"
          >
            Masuk sekarang
            <ArrowRightIcon />
          </Link>
        </div>
      </div>
    </section>
  );
}
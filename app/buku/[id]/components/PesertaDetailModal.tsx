"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Status = "hadir" | "izin" | "alpa";
type Field = { id: string; key: string; label: string };
type RecapRow = { tanggal: string; status: Status; catatan: string | null };
type InfoData = { email: string | null; fields: Field[]; values: Record<string, string> };
type View = "menu" | "info" | "recap";

type Props = {
  bookId: string;
  participantId: string;
  onClose: () => void;
};

// Warna tembus pandang: latar transparan + border tipis + teks gelap agar tetap jelas
const STATUS: Record<Status, { label: string; badge: string; box: string; dot: string }> = {
  hadir: {
    label: "Hadir",
    badge: "bg-emerald-600/15 text-emerald-800",
    box: "border border-emerald-600/40 bg-emerald-600/25 text-emerald-900",
    dot: "border border-emerald-600/50 bg-emerald-600/30",
  },
  izin: {
    label: "Izin",
    badge: "bg-amber-600/15 text-amber-800",
    box: "border border-amber-600/40 bg-amber-600/25 text-amber-900",
    dot: "border border-amber-600/50 bg-amber-600/30",
  },
  alpa: {
    label: "Alpa",
    badge: "bg-red-600/15 text-red-800",
    box: "border border-red-600/40 bg-red-600/25 text-red-900",
    dot: "border border-red-600/50 bg-red-600/30",
  },
};

const STATUS_KEYS: Status[] = ["hadir", "izin", "alpa"];
const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const pad = (n: number) => String(n).padStart(2, "0");

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatLong = (iso: string) =>
  parseISO(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatMonth = (key: string) =>
  parseISO(`${key}-01`).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

const currentMonthKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/* ---------- Ikon ---------- */
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
  <Svg className={className}>
    <path d="m9 6 6 6-6 6" />
  </Svg>
);
const ChevronLeft = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}>
    <path d="m15 6-6 6 6 6" />
  </Svg>
);
const ChartIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M5 20V11M12 20V4M19 20v-6" />
  </Svg>
);
const UserIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </Svg>
);
const MailIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </Svg>
);

const btnGhost =
  "flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
const btnPrimary =
  "flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
const btnNav =
  "flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

/* ---------- Skeleton (shimmer) ---------- */
const MODAL_CSS = `
.pd-sk{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:pd-shimmer 1.4s ease-in-out infinite}
@keyframes pd-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
.pd-fade{animation:pd-fade .25s ease-out both}
@keyframes pd-fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.pd-sk,.pd-fade{animation:none}}
`;

function Sk({ className = "" }: { className?: string }) {
  return <div className={`pd-sk ${className}`} aria-hidden="true" />;
}

function HeadSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <h2 id="detail-title" className="sr-only">
        Memuat detail peserta
      </h2>
      <div className="flex items-center gap-3">
        <Sk className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Sk className="h-4 w-2/3 rounded" />
          <Sk className="h-3 w-1/3 rounded" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3.5">
            <Sk className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Sk className="h-3.5 w-1/3 rounded" />
              <Sk className="h-3 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
      <Sk className="mt-5 h-10 w-full rounded-2xl" />
    </div>
  );
}

function InfoSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mt-4">
      <span className="sr-only">Memuat data peserta</span>
      <div className="rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center gap-3">
          <Sk className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Sk className="h-4 w-1/2 rounded" />
            <Sk className="h-3 w-3/4 rounded" />
          </div>
        </div>
      </div>
      <Sk className="mb-2 mt-5 h-3 w-24 rounded" />
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2 px-4 py-3">
            <Sk className="h-2.5 w-16 rounded" />
            <Sk className="h-3.5 w-3/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RecapSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mt-3">
      <span className="sr-only">Memuat rekap kehadiran</span>
      <Sk className="h-[78px] w-full rounded-xl" />
      <div className="mt-3 flex items-center justify-between">
        <Sk className="h-8 w-8 rounded-xl" />
        <Sk className="h-4 w-28 rounded" />
        <Sk className="h-8 w-8 rounded-xl" />
      </div>
      <Sk className="mt-2 h-[78px] w-full rounded-xl" />
      <div className="mt-3 grid grid-cols-7 gap-1">
        {Array.from({ length: 28 }).map((_, i) => (
          <Sk key={i} className="h-8 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ---------- Ringkasan ringkas (keseluruhan & bulanan) ---------- */
type SummaryData = { hadir: number; izin: number; alpa: number; total: number; pct: number };

function SummaryCompact({ title, data }: { title: string; data: SummaryData }) {
  return (
    <section className="rounded-xl border border-slate-200 px-3 py-2" aria-label={title}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-800">{title}</span>
        <span className="text-slate-500">
          {data.total} hari
          {data.total > 0 && (
            <>
              {" · "}
              <span className="font-semibold text-slate-800">{data.pct}%</span>
            </>
          )}
        </span>
      </div>

      <div className="mt-1.5 flex gap-1.5">
        {STATUS_KEYS.map((s) => (
          <span
            key={s}
            className={`flex-1 rounded-lg px-2 py-1 text-center text-[11px] font-medium ${STATUS[s].badge}`}
          >
            {STATUS[s].label} <span className="font-bold">{data[s]}</span>
          </span>
        ))}
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-emerald-600/70" style={{ width: `${data.pct}%` }} />
      </div>
    </section>
  );
}

export default function PesertaDetailModal({ bookId, participantId, onClose }: Props) {
  const supabase = useMemo(() => createClient(), []);

  const [view, setView] = useState<View>("menu");

  // Nama peserta (ringan, hanya untuk judul menu)
  const [name, setName] = useState<string | null>(null);
  const [headLoading, setHeadLoading] = useState(true);
  const [headError, setHeadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Data peserta: dimuat hanya saat "Lihat data" dipilih
  const [info, setInfo] = useState<InfoData | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const infoBusy = useRef(false);

  // Rekap: dimuat hanya saat "Lihat rekap" dipilih
  const [recap, setRecap] = useState<RecapRow[] | null>(null);
  const [recapError, setRecapError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<string>(currentMonthKey);
  const recapBusy = useRef(false);

  /* ---------- Muat nama peserta saja ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("participants")
        .select("name")
        .eq("id", participantId)
        .maybeSingle();
      if (cancelled) return;

      if (error) setHeadError(error.message || "Gagal memuat data peserta.");
      else if (!data) setHeadError("Peserta tidak ditemukan.");
      else setName(data.name as string);
      setHeadLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, participantId, reloadKey]);

  function retryHead() {
    setHeadError(null);
    setHeadLoading(true);
    setReloadKey((k) => k + 1);
  }

  /* ---------- Muat data peserta (email, kolom, isi kolom) ---------- */
  const loadInfo = useCallback(async () => {
    if (infoBusy.current) return;
    infoBusy.current = true;
    setInfoError(null);

    const [pRes, fRes, dRes] = await Promise.all([
      supabase.from("participants").select("email").eq("id", participantId).maybeSingle(),
      supabase
        .from("participant_fields")
        .select("id, key, label")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("book_participant_data")
        .select("data")
        .eq("book_id", bookId)
        .eq("participant_id", participantId)
        .maybeSingle(),
    ]);
    infoBusy.current = false;

    const err = pRes.error || fRes.error || dRes.error;
    if (err) {
      setInfoError(err.message || "Gagal memuat data peserta.");
      return;
    }
    setInfo({
      email: (pRes.data?.email as string | null) ?? null,
      fields: (fRes.data ?? []) as Field[],
      values: ((dRes.data?.data ?? {}) as Record<string, string>) || {},
    });
  }, [supabase, bookId, participantId]);

  function openInfo() {
    setView("info");
    if (!info) loadInfo();
  }

  /* ---------- Muat rekap kehadiran ---------- */
  const loadRecap = useCallback(async () => {
    if (recapBusy.current) return;
    recapBusy.current = true;
    setRecapError(null);

    const { data, error } = await supabase
      .from("attendance")
      .select("tanggal, status, catatan")
      .eq("book_id", bookId)
      .eq("participant_id", participantId)
      .order("tanggal", { ascending: true });
    recapBusy.current = false;

    if (error) {
      setRecapError(error.message);
      return;
    }
    setRecap((data ?? []) as RecapRow[]);
  }, [supabase, bookId, participantId]);

  function openRecap() {
    setView("recap");
    setSelected(null);
    setViewMonth(currentMonthKey());
    if (!recap) loadRecap();
  }

  function backToMenu() {
    setView("menu");
  }

  function goMonth(delta: number) {
    setSelected(null);
    setViewMonth((k) => shiftMonth(k, delta));
  }

  // Batas navigasi: dari bulan catatan paling awal sampai bulan ini (atau catatan terbaru jika lebih baru)
  const bounds = useMemo(() => {
    const now = currentMonthKey();
    if (!recap || recap.length === 0) return { min: now, max: now };
    const first = recap[0].tanggal.slice(0, 7);
    const last = recap[recap.length - 1].tanggal.slice(0, 7);
    return { min: first < now ? first : now, max: last > now ? last : now };
  }, [recap]);

  // Rekap keseluruhan (semua bulan)
  const overall = useMemo<SummaryData | null>(() => {
    if (!recap) return null;
    const c = { hadir: 0, izin: 0, alpa: 0 };
    for (const r of recap) c[r.status]++;
    const total = c.hadir + c.izin + c.alpa;
    return { ...c, total, pct: total > 0 ? Math.round((c.hadir / total) * 100) : 0 };
  }, [recap]);

  // Rekap untuk bulan yang sedang ditampilkan + data kalender
  const month = useMemo(() => {
    if (!recap) return null;
    const [y, m] = viewMonth.split("-").map(Number);
    const rows = new Map<number, RecapRow>();
    const c = { hadir: 0, izin: 0, alpa: 0 };
    for (const r of recap) {
      if (r.tanggal.slice(0, 7) !== viewMonth) continue;
      rows.set(Number(r.tanggal.slice(8, 10)), r);
      c[r.status]++;
    }
    const total = c.hadir + c.izin + c.alpa;
    return {
      label: formatMonth(viewMonth),
      daysInMonth: new Date(y, m, 0).getDate(),
      offset: (new Date(y, m - 1, 1).getDay() + 6) % 7, // Senin = 0
      rows,
      ...c,
      total,
      pct: total > 0 ? Math.round((c.hadir / total) * 100) : 0,
    };
  }, [recap, viewMonth]);

  const selectedRow = useMemo(() => {
    if (!selected || !month) return null;
    return month.rows.get(Number(selected.slice(8, 10))) ?? null;
  }, [selected, month]);

  // Escape menutup modal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const infoLoading = view === "info" && !info && !infoError;
  const recapLoading = view === "recap" && !recap && !recapError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <style>{MODAL_CSS}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
      >
        {/* Memuat nama */}
        {headLoading && <HeadSkeleton />}

        {/* Galat */}
        {!headLoading && (headError || !name) && (
          <div className="pd-fade">
            <h2 id="detail-title" className="text-lg font-semibold">
              Detail peserta
            </h2>
            <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {headError ?? "Peserta tidak ditemukan."}
            </p>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={retryHead} className={btnGhost}>
                Coba lagi
              </button>
              <button type="button" onClick={onClose} className={btnPrimary}>
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Menu pilihan */}
        {!headLoading && !headError && name && view === "menu" && (
          <div className="pd-fade">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-sm font-semibold text-white">
                {initials(name)}
              </span>
              <div className="min-w-0">
                <h2 id="detail-title" className="truncate text-lg font-semibold leading-tight">
                  {name}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">Pilih yang ingin ditampilkan</p>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={openInfo}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UserIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">Lihat data</span>
                  <span className="block text-xs text-slate-500">Email dan isian kolom peserta</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={openRecap}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <ChartIcon />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">Lihat rekap</span>
                  <span className="block text-xs text-slate-500">Riwayat kehadiran per tanggal</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className={btnPrimary}>
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Data peserta */}
        {!headLoading && !headError && name && view === "info" && (
          <div className="pd-fade">
            <h2 id="detail-title" className="text-lg font-semibold">
              Data peserta
            </h2>

            {infoLoading && <InfoSkeleton />}

            {infoError && (
              <div role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>{infoError}</p>
                <button type="button" onClick={loadInfo} className="mt-2 cursor-pointer font-medium hover:underline">
                  Coba lagi
                </button>
              </div>
            )}

            {info && (
              <div className="pd-fade mt-4">
                {/* Kartu profil */}
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-base font-semibold text-white">
                    {initials(name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <MailIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {info.email ? (
                        <span className="min-w-0 break-all">{info.email}</span>
                      ) : (
                        <span className="italic text-slate-400">Email belum diisi</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Isian kolom */}
                <div className="mb-2 mt-5 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Isian kolom</h3>
                  {info.fields.length > 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                      {info.fields.length}
                    </span>
                  )}
                </div>

                {info.fields.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                    Belum ada kolom tambahan di buku ini.
                  </p>
                ) : (
                  <dl className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                    {info.fields.map((f) => {
                      const v = info.values[f.key];
                      return (
                        <div key={f.id} className="px-4 py-2.5">
                          <dt className="text-[11px] font-medium text-slate-400">{f.label}</dt>
                          <dd className="mt-0.5 break-words text-sm font-medium text-slate-800">
                            {v ? v : <span className="font-normal italic text-slate-400">Belum diisi</span>}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                )}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={backToMenu} className={btnGhost}>
                Kembali
              </button>
              <button type="button" onClick={onClose} className={btnPrimary}>
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Rekap */}
        {!headLoading && !headError && name && view === "recap" && (
          <div className="pd-fade">
            <h2 id="detail-title" className="text-lg font-semibold">
              Rekap kehadiran
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{name}</p>

            {recapLoading && <RecapSkeleton />}

            {recapError && (
              <div role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>{recapError}</p>
                <button type="button" onClick={loadRecap} className="mt-2 cursor-pointer font-medium hover:underline">
                  Coba lagi
                </button>
              </div>
            )}

            {recap && month && overall && (
              <div className="pd-fade">
                {overall.total === 0 ? (
                  <p className="mt-4 rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    Belum ada catatan kehadiran untuk peserta ini.
                  </p>
                ) : (
                  <>
                    {/* Rekap keseluruhan */}
                    <div className="mt-3">
                      <SummaryCompact title="Rekap keseluruhan" data={overall} />
                    </div>

                    {/* Navigasi bulan */}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => goMonth(-1)}
                        disabled={viewMonth <= bounds.min}
                        aria-label="Bulan sebelumnya"
                        className={btnNav}
                      >
                        <ChevronLeft />
                      </button>
                      <h3 className="text-sm font-semibold capitalize text-slate-800" aria-live="polite">
                        {month.label}
                      </h3>
                      <button
                        type="button"
                        onClick={() => goMonth(1)}
                        disabled={viewMonth >= bounds.max}
                        aria-label="Bulan berikutnya"
                        className={btnNav}
                      >
                        <ChevronRight />
                      </button>
                    </div>

                    {/* Rekap bulan ini */}
                    <div className="mt-2">
                      <SummaryCompact title="Rekap bulan ini" data={month} />
                    </div>

                    {/* Kalender satu bulan: yang kosong tanpa warna */}
                    <div className="mt-3 grid grid-cols-7 gap-1 text-center">
                      {WEEKDAYS.map((w) => (
                        <span key={w} className="pb-0.5 text-[10px] font-medium text-slate-400">
                          {w}
                        </span>
                      ))}

                      {Array.from({ length: month.offset }).map((_, i) => (
                        <span key={`blank-${i}`} aria-hidden="true" />
                      ))}

                      {Array.from({ length: month.daysInMonth }, (_, i) => i + 1).map((day) => {
                        const row = month.rows.get(day);
                        if (!row) {
                          return (
                            <span key={day} className="flex h-8 items-center justify-center text-sm text-slate-400">
                              {day}
                            </span>
                          );
                        }
                        const active = selected === row.tanggal;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => setSelected(active ? null : row.tanggal)}
                            aria-pressed={active}
                            aria-label={`${formatLong(row.tanggal)}: ${STATUS[row.status].label}`}
                            className={`flex h-8 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                              STATUS[row.status].box
                            } ${active ? "ring-2 ring-slate-900 ring-offset-1" : ""}`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>

                    {month.total === 0 && (
                      <p className="mt-2 text-center text-xs text-slate-400">
                        Tidak ada catatan kehadiran di bulan ini.
                      </p>
                    )}

                    {/* Keterangan warna */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      {STATUS_KEYS.map((s) => (
                        <span key={s} className="flex items-center gap-1.5">
                          <span className={`h-3 w-3 rounded ${STATUS[s].dot}`} aria-hidden="true" />
                          {STATUS[s].label}
                        </span>
                      ))}
                    </div>

                    {/* Detail tanggal yang dipilih */}
                    {selectedRow ? (
                      <div className="mt-2 rounded-2xl border border-slate-200 px-4 py-2.5" aria-live="polite">
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-sm text-slate-800">
                            {formatLong(selectedRow.tanggal)}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              STATUS[selectedRow.status].badge
                            }`}
                          >
                            {STATUS[selectedRow.status].label}
                          </span>
                        </div>
                        {selectedRow.status === "izin" && selectedRow.catatan && (
                          <p className="mt-1 break-words text-xs text-slate-500">{selectedRow.catatan}</p>
                        )}
                      </div>
                    ) : (
                      month.total > 0 && (
                        <p className="mt-2 text-xs text-slate-400">Ketuk tanggal berwarna untuk melihat detailnya.</p>
                      )
                    )}
                  </>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button type="button" onClick={backToMenu} className={btnGhost}>
                Kembali
              </button>
              <button type="button" onClick={onClose} className={btnPrimary}>
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
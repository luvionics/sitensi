"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BukuSidebar from "./components/BukuSidebar";
import PesertaDetailModal from "./components/PesertaDetailModal";

type Status = "hadir" | "izin" | "alpa";
type Participant = { id: string; name: string };
type Rec = { status: Status; catatan: string | null };
type RecMap = Record<string, Rec>;
type Draft = Record<string, Rec | null>;
type CacheEntry = { map: RecMap; at: number };

type BpRow = {
  participant_id: string;
  participants: Participant | Participant[] | null;
};

// Cache absensi per tanggal: lama data dianggap segar, dan jeda sebelum fetch
// (agar klik < > beruntun hanya mengambil tanggal terakhir)
const CACHE_TTL_MS = 5 * 60 * 1000;
const FETCH_DELAY_MS = 250;

const STATUSES: { value: Status; label: string; active: string }[] = [
  { value: "hadir", label: "Hadir", active: "border-emerald-600 bg-emerald-600 text-white" },
  { value: "izin", label: "Izin", active: "border-amber-500 bg-amber-500 text-white" },
  { value: "alpa", label: "Alpa", active: "border-red-500 bg-red-500 text-white" },
];

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const CAL_CSS = `
.cal-fade{animation:cal-fade .2s ease-out both}
@keyframes cal-fade{from{opacity:0}to{opacity:1}}
.cal-sheet{animation:cal-up .3s cubic-bezier(.2,.8,.2,1) both}
@keyframes cal-up{from{transform:translateY(100%)}to{transform:none}}
@keyframes cal-pop{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:none}}
@media (min-width:640px){.cal-sheet{animation-name:cal-pop;animation-duration:.22s}}
@media (prefers-reduced-motion: reduce){.cal-fade,.cal-sheet{animation:none}}
`;

const toISO = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const shiftDay = (iso: string, n: number) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

const formatLong = (iso: string) =>
  parseISO(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatWeekday = (iso: string) =>
  parseISO(iso).toLocaleDateString("id-ID", { weekday: "long" });

const formatFull = (iso: string) =>
  parseISO(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

const formatMonthShort = (iso: string) =>
  parseISO(iso).toLocaleDateString("id-ID", { month: "short" }).replace(".", "");

const formatMonthYear = (y: number, m: number) =>
  new Date(y, m, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

const normNote = (s: string | null | undefined) => s?.trim() || null;

// Dua catatan kehadiran dianggap sama jika status dan catatan (setelah dirapikan) sama
const sameRec = (a: Rec | null | undefined, b: Rec | null | undefined) => {
  if (!a || !b) return !a && !b;
  return a.status === b.status && normNote(a.catatan) === normNote(b.catatan);
};

// Ambil data dari cache bila masih segar
const freshFrom = (cache: Map<string, CacheEntry>, date: string): RecMap | null => {
  const hit = cache.get(date);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(date);
    return null;
  }
  return hit.map;
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

const ChevronLeft = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><path d="m15 18-6-6 6-6" /></Svg>
);
const ChevronRight = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="m9 18 6-6-6-6" /></Svg>
);
const SearchIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
const CalendarIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </Svg>
);

/* ---------- Input catatan izin ---------- */
function NoteInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Catatan izin (opsional)"
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
    />
  );
}

/* ---------- Baris peserta (memo: hanya dirender ulang jika datanya berubah) ---------- */
type RowProps = {
  p: Participant;
  no: number;
  rec: Rec | undefined;
  changed: boolean;
  locked: boolean;
  onOpen: (id: string) => void;
  onStatus: (pid: string, status: Status) => void;
  onNote: (pid: string, text: string) => void;
};

const PersonRow = memo(function PersonRow({ p, no, rec, changed, locked, onOpen, onStatus, onNote }: RowProps) {
  return (
    <li
      className={`rounded-3xl border bg-white p-4 ${
        changed ? "border-blue-300 ring-1 ring-blue-100" : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={() => onOpen(p.id)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-bold text-white">
          {String(no).padStart(2, "0")}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{p.name}</span>
          <span className="block truncate text-[11px] text-slate-400">
            {changed ? "Belum disimpan" : "Ketuk untuk lihat data dan rekap"}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {STATUSES.map((s) => {
          const active = rec?.status === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onStatus(p.id, s.value)}
              disabled={locked}
              aria-pressed={active}
              className={`h-10 cursor-pointer touch-manipulation select-none rounded-full border text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 disabled:cursor-wait disabled:opacity-60 ${
                active
                  ? s.active
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {rec?.status === "izin" && (
        <NoteInput value={rec.catatan ?? ""} onChange={(v) => onNote(p.id, v)} disabled={locked} />
      )}
    </li>
  );
});

export default function BukuPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const [bookName, setBookName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [today, setToday] = useState("");
  const [date, setDate] = useState("");
  // recs = data tersimpan di database; draft = perubahan yang belum disimpan
  const [recs, setRecs] = useState<{ date: string; map: RecMap } | null>(null);
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  // Cache absensi per tanggal (hanya di memori halaman ini)
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  // Dinaikkan untuk memaksa muat ulang tanggal yang sedang tampil
  const [reloadKey, setReloadKey] = useState(0);
  const firstLoadRef = useRef(true);

  // Kalender pemilih tanggal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [view, setView] = useState<{ y: number; m: number }>({ y: 0, m: 0 });

  // Modal detail peserta: halaman hanya memegang id-nya, isinya diproses modal sendiri
  const [detailId, setDetailId] = useState<string | null>(null);
  const openDetail = useCallback((id: string) => setDetailId(id), []);
  const closeDetail = useCallback(() => setDetailId(null), []);

  /* ---------- Muat data dasar ---------- */
  const loadBase = useCallback(async () => {
    setError(null);

    const [bookRes, bpRes] = await Promise.all([
      supabase.from("books").select("name").eq("id", bookId).maybeSingle(),
      supabase
        .from("book_participants")
        .select("participant_id, participants(id, name)")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true }),
    ]);

    if (bookRes.error || bpRes.error) {
      setError(bookRes.error?.message || bpRes.error?.message || "Gagal memuat data.");
    } else if (!bookRes.data) {
      setNotFound(true);
    } else {
      setBookName(bookRes.data.name);

      const list: Participant[] = [];
      for (const r of (bpRes.data ?? []) as unknown as BpRow[]) {
        const p = Array.isArray(r.participants) ? r.participants[0] : r.participants;
        if (p) list.push({ id: p.id, name: p.name });
      }
      setParticipants(list);
    }

    setLoading(false);
  }, [supabase, bookId]);

  useEffect(() => {
    const t = toISO(new Date());
    /* eslint-disable react-hooks/set-state-in-effect */
    setToday(t);
    setDate(t);
    loadBase();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loadBase]);

  // Buku berganti: kosongkan cache
  useEffect(() => {
    const cache = cacheRef.current;
    cache.clear();
    return () => cache.clear();
  }, [bookId]);

  /* ---------- Muat absensi untuk tanggal terpilih (cache dulu, baru database) ---------- */
  useEffect(() => {
    if (!date) return;

    const cached = freshFrom(cacheRef.current, date);
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecs((prev) => (prev && prev.date === date ? prev : { date, map: cached }));
      return;
    }

    let cancelled = false;
    // Muat pertama langsung; perpindahan tanggal diberi jeda agar klik beruntun tidak memicu banyak request
    const delay = firstLoadRef.current ? 0 : FETCH_DELAY_MS;
    firstLoadRef.current = false;

    const timer = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("participant_id, status, catatan")
        .eq("book_id", bookId)
        .eq("tanggal", date);
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setRecs({ date, map: {} });
        return;
      }
      const map: RecMap = {};
      for (const r of (data ?? []) as { participant_id: string; status: Status; catatan: string | null }[]) {
        map[r.participant_id] = { status: r.status, catatan: r.catatan };
      }
      cacheRef.current.set(date, { map, at: Date.now() });
      setRecs({ date, map });
    }, delay);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [supabase, bookId, date, reloadKey]);

  const recsLoading = !recs || recs.date !== date;
  const locked = recsLoading || saving;

  // Data tersimpan untuk tanggal terpilih
  const savedMap: RecMap = useMemo(() => (recsLoading || !recs ? {} : recs.map), [recsLoading, recs]);

  // Tampilan = data tersimpan + draf (objek Rec yang tidak berubah tetap sama referensinya)
  const records: RecMap = useMemo(() => {
    const map: RecMap = { ...savedMap };
    for (const [pid, rec] of Object.entries(draft)) {
      if (rec) map[pid] = rec;
      else delete map[pid];
    }
    return map;
  }, [savedMap, draft]);

  // Peserta yang benar-benar berbeda dari data tersimpan
  const dirtyIds = useMemo(
    () => Object.keys(draft).filter((pid) => !sameRec(draft[pid], savedMap[pid] ?? null)),
    [draft, savedMap]
  );
  const dirtySet = useMemo(() => new Set(dirtyIds), [dirtyIds]);
  const dirtyCount = dirtyIds.length;

  // Ref agar handler baris tetap stabil (tidak membuat semua baris dirender ulang)
  const savedMapRef = useRef<RecMap>({});
  const lockedRef = useRef(false);
  useEffect(() => {
    savedMapRef.current = savedMap;
    lockedRef.current = locked;
  }, [savedMap, locked]);

  /* ---------- Ubah draf (belum menyimpan ke database) ---------- */
  const setStatus = useCallback((pid: string, status: Status) => {
    if (lockedRef.current) return;
    setError(null);
    setDraft((prev) => {
      const cur = pid in prev ? prev[pid] : savedMapRef.current[pid] ?? null;
      // Ketuk status yang sama sekali lagi = kosongkan
      if (cur?.status === status) return { ...prev, [pid]: null };
      return {
        ...prev,
        [pid]: { status, catatan: status === "izin" ? cur?.catatan ?? null : null },
      };
    });
  }, []);

  const setNote = useCallback((pid: string, text: string) => {
    if (lockedRef.current) return;
    setDraft((prev) => {
      const cur = pid in prev ? prev[pid] : savedMapRef.current[pid] ?? null;
      if (!cur || cur.status !== "izin") return prev;
      return { ...prev, [pid]: { status: "izin", catatan: text } };
    });
  }, []);

  function discardDraft() {
    if (saving) return;
    setDraft({});
    setError(null);
  }

  /* ---------- Simpan semua perubahan sekaligus ---------- */
  async function saveAll() {
    if (saving || recsLoading || dirtyCount === 0) return;
    const d = date;
    const ids = [...dirtyIds];

    const toDelete: string[] = [];
    const toUpsert: { book_id: string; participant_id: string; tanggal: string; status: Status; catatan: string | null }[] =
      [];

    for (const pid of ids) {
      const rec = draft[pid];
      if (!rec) {
        toDelete.push(pid);
      } else {
        toUpsert.push({
          book_id: bookId,
          participant_id: pid,
          tanggal: d,
          status: rec.status,
          catatan: rec.status === "izin" ? normNote(rec.catatan) : null,
        });
      }
    }

    setSaving(true);
    setError(null);

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("book_id", bookId)
        .eq("tanggal", d)
        .in("participant_id", toDelete);
      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from("attendance")
        .upsert(toUpsert, { onConflict: "book_id,participant_id,tanggal" });
      if (error) {
        setError(error.message);
        setSaving(false);
        // Sebagian (penghapusan) mungkin sudah masuk: buang cache tanggal ini lalu muat ulang dari database
        cacheRef.current.delete(d);
        setRecs(null);
        setReloadKey((k) => k + 1);
        return;
      }
    }

    // Terapkan ke data tersimpan + cache, lalu kosongkan draf untuk peserta yang baru disimpan
    const nextMap: RecMap = { ...savedMap };
    for (const pid of toDelete) delete nextMap[pid];
    for (const row of toUpsert) nextMap[row.participant_id] = { status: row.status, catatan: row.catatan };
    cacheRef.current.set(d, { map: nextMap, at: Date.now() });
    setRecs({ date: d, map: nextMap });
    setDraft((prev) => {
      const next = { ...prev };
      for (const pid of ids) delete next[pid];
      return next;
    });
    setSaving(false);
  }

  /* ---------- Pindah tanggal (dengan peringatan jika ada draf) ---------- */
  function changeDate(next: string) {
    if (!next || next === date) return;
    if (dirtyCount > 0) {
      const ok = window.confirm("Ada perubahan yang belum disimpan. Pindah tanggal dan buang perubahan?");
      if (!ok) return;
    }
    setDraft({});
    // Bila tanggal tujuan ada di cache, tampilkan seketika tanpa menunggu
    const cached = freshFrom(cacheRef.current, next);
    if (cached) setRecs({ date: next, map: cached });
    setDate(next);
  }

  // Peringatan saat menutup / memuat ulang halaman dengan draf belum tersimpan
  useEffect(() => {
    if (dirtyCount === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirtyCount]);

  function goHome() {
    if (dirtyCount > 0 && !window.confirm("Ada perubahan yang belum disimpan. Tetap keluar?")) return;
    router.push("/");
  }

  // Dipakai sidebar sebelum pindah halaman
  const confirmLeave = useCallback(
    () => dirtyCount === 0 || window.confirm("Ada perubahan yang belum disimpan. Tetap pindah halaman?"),
    [dirtyCount]
  );

  /* ---------- Kalender ---------- */
  function openPicker() {
    if (saving || !date) return;
    const d = parseISO(date);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setPickerOpen(true);
  }

  function closePicker() {
    setPickerOpen(false);
  }

  function pickDate(iso: string) {
    setPickerOpen(false);
    changeDate(iso);
  }

  function shiftMonth(n: number) {
    setView((v) => {
      const d = new Date(v.y, v.m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  // Escape menutup kalender
  useEffect(() => {
    if (!pickerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerOpen]);

  // Kunci scroll halaman saat kalender terbuka
  useEffect(() => {
    if (!pickerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [pickerOpen]);

  const calendarCells = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const offset = (first.getDay() + 6) % 7; // minggu dimulai Senin
    const total = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(toISO(new Date(view.y, view.m, d)));
    return cells;
  }, [view]);

  const todayDate = today ? parseISO(today) : null;
  const atCurrentMonth =
    !!todayDate && view.y === todayDate.getFullYear() && view.m === todayDate.getMonth();

  /* ---------- Ringkasan & daftar ---------- */
  const counts = useMemo(() => {
    let hadir = 0;
    let izin = 0;
    let alpa = 0;
    for (const p of participants) {
      const s = records[p.id]?.status;
      if (s === "hadir") hadir++;
      else if (s === "izin") izin++;
      else if (s === "alpa") alpa++;
    }
    return { hadir, izin, alpa, belum: participants.length - hadir - izin - alpa };
  }, [participants, records]);

  const q = query.trim().toLowerCase();
  const visible = useMemo(
    () =>
      participants
        .map((p, i) => ({ p, no: i + 1 }))
        .filter(({ p }) => p.name.toLowerCase().includes(q)),
    [participants, q]
  );

  const isToday = date === today;

  /* ---------- Render ---------- */
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pt-16 text-center text-slate-900">
        <h1 className="text-base font-semibold">Buku tidak ditemukan</h1>
        <p className="mt-1 text-sm text-slate-500">Buku ini sudah dihapus atau bukan milik akun Anda.</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-5 cursor-pointer rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Kembali ke beranda
        </button>
      </div>
    );
  }

  const ready = !loading && !!date;

  const summary = [
    { label: "Hadir", n: counts.hadir, dot: "bg-emerald-500", num: "text-emerald-600" },
    { label: "Izin", n: counts.izin, dot: "bg-amber-500", num: "text-amber-600" },
    { label: "Alpa", n: counts.alpa, dot: "bg-red-500", num: "text-red-600" },
    { label: "Belum diisi", n: counts.belum, dot: "bg-slate-300", num: "text-slate-700" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{CAL_CSS}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-50">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={goHome}
            aria-label="Kembali ke beranda"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-left text-lg font-bold">
            {ready ? bookName : "\u00A0"}
          </h1>
        </div>
      </header>

      <main className={`mx-auto max-w-2xl px-4 sm:px-6 ${dirtyCount > 0 ? "pb-32" : "pb-28"}`}>
        {error && (
          <div
            role="alert"
            className="mb-3 flex items-start justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button onClick={() => setError(null)} className="shrink-0 cursor-pointer font-medium hover:underline">
              Tutup
            </button>
          </div>
        )}

        {!ready ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-20 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-12 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        ) : (
          <>
            {/* Kartu tanggal */}
            <section className="rounded-3xl border border-slate-200 bg-white p-3" aria-label="Tanggal absensi">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => changeDate(shiftDay(date, -1))}
                  disabled={saving}
                  aria-label="Hari sebelumnya"
                  className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ChevronLeft />
                </button>

                <button
                  type="button"
                  onClick={openPicker}
                  disabled={saving}
                  aria-label={`Pilih tanggal, saat ini ${formatLong(date)}`}
                  aria-haspopup="dialog"
                  className="group flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {/* Lencana kalender */}
                  <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20">
                    <span className="text-[10px] font-semibold uppercase leading-none tracking-wide text-blue-100">
                      {formatMonthShort(date)}
                    </span>
                    <span className="mt-0.5 text-lg font-bold leading-none">{parseISO(date).getDate()}</span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{formatWeekday(date)}</span>
                      {isToday && (
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          Hari ini
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{formatFull(date)}</span>
                  </span>

                  <CalendarIcon className="h-5 w-5 shrink-0 text-slate-400 group-hover:text-blue-600" />
                </button>

                <button
                  type="button"
                  onClick={() => changeDate(shiftDay(date, 1))}
                  disabled={isToday || saving}
                  aria-label="Hari berikutnya"
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border focus:outline-none ${
                    isToday || saving
                      ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                      : "cursor-pointer border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95"
                  }`}
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {!isToday && (
                <button
                  type="button"
                  onClick={() => changeDate(today)}
                  disabled={saving}
                  className="mt-2.5 cursor-pointer rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Kembali ke hari ini
                </button>
              )}
            </section>

            {/* Kartu total */}
            <section
              className="mt-3 rounded-3xl border border-slate-200 bg-white py-3"
              aria-label="Ringkasan kehadiran"
            >
              <ul className="grid grid-cols-4 divide-x divide-slate-100">
                {summary.map((s) => (
                  <li key={s.label} className="flex flex-col items-center px-1 text-center">
                    <span className={`text-xl font-bold leading-none ${s.num}`}>
                      {recsLoading ? "–" : s.n}
                    </span>
                    <span className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-500">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
                      <span className="truncate">{s.label}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Pencarian */}
            <div className="relative mt-4">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari peserta"
                className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Daftar peserta */}
            {participants.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <h2 className="text-sm font-semibold">Belum ada peserta</h2>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  Tambahkan peserta lewat tombol Kelola di kanan atas, lalu mulai catat kehadiran.
                </p>
              </div>
            ) : visible.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                <h2 className="text-sm font-semibold">Tidak ada hasil</h2>
                <p className="mt-1 text-xs text-slate-500">Coba kata kunci lain.</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {visible.map(({ p, no }) => (
                  <PersonRow
                    key={`${p.id}-${date}`}
                    p={p}
                    no={no}
                    rec={records[p.id]}
                    changed={dirtySet.has(p.id)}
                    locked={locked}
                    onOpen={openDetail}
                    onStatus={setStatus}
                    onNote={setNote}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {/* Sidebar mandiri: tombol Kelola + gerigi + panel ada di dalam komponen */}
      <BukuSidebar
        bookId={bookId}
        title={bookName}
        hideTrigger={!ready || dirtyCount > 0}
        confirmLeave={confirmLeave}
      />

      {/* Bar simpan melayang */}
      {dirtyCount > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
          <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-3 rounded-3xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="min-w-0 flex-1 pl-2">
              <p className="truncate text-sm font-semibold">{dirtyCount} perubahan</p>
              <p className="truncate text-[11px] text-slate-500">Belum disimpan · {formatLong(date)}</p>
            </div>
            <button
              type="button"
              onClick={discardDraft}
              disabled={saving}
              className="cursor-pointer rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Batalkan
            </button>
            <button
              type="button"
              onClick={saveAll}
              disabled={saving}
              className="cursor-pointer rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-blue-300"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </div>
      )}

      {/* Kalender pilih tanggal (bottom sheet di mobile) */}
      {pickerOpen && (
        <div
          className="cal-fade fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4"
          onClick={closePicker}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pilih tanggal"
            onClick={(e) => e.stopPropagation()}
            className="cal-sheet w-full max-w-sm rounded-t-3xl bg-white px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:rounded-3xl sm:p-5"
          >
            <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />

            {/* Navigasi bulan */}
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Bulan sebelumnya"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <ChevronLeft />
              </button>
              <h2 className="text-sm font-semibold capitalize" aria-live="polite">
                {formatMonthYear(view.y, view.m)}
              </h2>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                disabled={atCurrentMonth}
                aria-label="Bulan berikutnya"
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Nama hari */}
            <div className="mt-3 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1">
                  {w}
                </span>
              ))}
            </div>

            {/* Tanggal */}
            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {calendarCells.map((iso, i) => {
                if (!iso) return <span key={`e${i}`} />;
                const disabled = iso > today;
                const selected = iso === date;
                const isTodayCell = iso === today;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => pickDate(iso)}
                    disabled={disabled}
                    aria-label={formatLong(iso)}
                    aria-pressed={selected}
                    aria-current={isTodayCell ? "date" : undefined}
                    className={`mx-auto flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      selected
                        ? "bg-blue-600 font-semibold text-white shadow-sm shadow-blue-600/30"
                        : disabled
                        ? "cursor-not-allowed text-slate-300"
                        : isTodayCell
                        ? "font-semibold text-blue-700 ring-1 ring-blue-300 hover:bg-blue-50"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    {parseISO(iso).getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => pickDate(today)}
                disabled={isToday}
                className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hari ini
              </button>
              <button
                type="button"
                onClick={closePicker}
                className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal detail peserta: mandiri, cukup diberi id buku dan id peserta */}
      {detailId && (
        <PesertaDetailModal
          key={detailId}
          bookId={bookId}
          participantId={detailId}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
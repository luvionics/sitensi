"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Sesuaikan dengan isi enum `attendance_status` di database kamu.
// "izin" wajib ada karena kolom catatan hanya boleh terisi saat status izin.
const STATUSES = ["hadir", "izin", "sakit", "alpa"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABEL: Record<Status, string> = {
  hadir: "Hadir",
  izin: "Izin",
  sakit: "Sakit",
  alpa: "Alpa",
};

const STATUS_ACTIVE: Record<Status, string> = {
  hadir: "border-emerald-600 bg-emerald-600 text-white",
  izin: "border-amber-500 bg-amber-500 text-white",
  sakit: "border-sky-600 bg-sky-600 text-white",
  alpa: "border-red-600 bg-red-600 text-white",
};

const STATUS_DOT: Record<Status, string> = {
  hadir: "bg-emerald-500",
  izin: "bg-amber-500",
  sakit: "bg-sky-500",
  alpa: "bg-red-500",
};

// Saat folder [id] sudah ada, ganti dengan `/folder/${book.folderId}` bila buku berada di folder
const HOME_HREF = "/";

// false = tidak bisa maju melewati hari ini. Ubah ke true bila ingin boleh mengisi tanggal mendatang.
const ALLOW_FUTURE = false;

type Book = { id: string; name: string; folderId: string | null; createdDate: string | null };
type Field = { id: string; key: string; label: string; sortOrder: number };
type Participant = {
  id: string;
  name: string;
  email: string | null;
  data: Record<string, string>;
};
type AttRecord = { status: Status; catatan: string | null };

type BookRow = { id: string; name: string; folder_id: string | null; created_at: string | null };
type FieldRow = { id: string; key: string; label: string; sort_order: number };
type ParticipantRow = { id: string; name: string; email: string | null; data: unknown };
type AttendanceRow = { participant_id: string; status: Status; catatan: string | null };

const toField = (r: FieldRow): Field => ({
  id: r.id,
  key: r.key,
  label: r.label,
  sortOrder: r.sort_order,
});

const toParticipant = (r: ParticipantRow): Participant => {
  const raw = (r.data && typeof r.data === "object" ? r.data : {}) as Record<string, unknown>;
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v !== null && v !== undefined) data[k] = String(v);
  }
  return { id: r.id, name: r.name, email: r.email, data };
};

// ---------- Helper tanggal (semua memakai string "YYYY-MM-DD" waktu lokal) ----------
const pad = (n: number) => String(n).padStart(2, "0");
const dateToStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dateToStr(new Date());
const parseDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s: string, n: number) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return dateToStr(d);
};
const fmtFull = (s: string) =>
  parseDate(s).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const fmtWeekday = (s: string) => parseDate(s).toLocaleDateString("id-ID", { weekday: "long" });
const fmtLongDate = (s: string) =>
  parseDate(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long" });
};
const daysInMonth = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m, 0).getDate();
};
const relativeLabel = (s: string) => {
  const t = todayStr();
  if (s === t) return "Hari ini";
  if (s === addDays(t, -1)) return "Kemarin";
  if (s === addDays(t, 1)) return "Besok";
  return null;
};

function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ---------- Ikon ----------
function ChevronLeft({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronDown({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function SearchIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function ColumnsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function FolderIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function TrashIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
    </svg>
  );
}

export default function BukuAbsensiPage() {
  const supabase = useMemo(() => createClient(), []);
  const { id: bookId } = useParams<{ id: string }>();

  const [book, setBook] = useState<Book | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [att, setAtt] = useState<Record<string, AttRecord>>({});

  const [loading, setLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selalu mulai dari hari ini
  const [date, setDate] = useState(todayStr());
  const dateRef = useRef(date);
  const [query, setQuery] = useState("");

  // Pemilih tanggal (modal folder bulan -> hari)
  const [dateOpen, setDateOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<string | null>(null);
  const [dateCounts, setDateCounts] = useState<Record<string, number> | null>(null);
  const pickerListRef = useRef<HTMLDivElement | null>(null);

  // Geser kiri/kanan untuk pindah hari
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // Dialog tambah peserta
  const [addOpen, setAddOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pData, setPData] = useState<Record<string, string>>({});
  const [addBusy, setAddBusy] = useState(false);

  // Dialog kelola kolom
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fLabel, setFLabel] = useState("");
  const [fieldBusy, setFieldBusy] = useState(false);

  // Dialog hapus peserta
  const [deleting, setDeleting] = useState<Participant | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const q = query.trim().toLowerCase();
  const today = todayStr();

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [bookRes, fieldsRes, partsRes] = await Promise.all([
      supabase
        .from("books")
        .select("id, name, folder_id, created_at")
        .eq("id", bookId)
        .maybeSingle(),
      supabase
        .from("participant_fields")
        .select("id, key, label, sort_order")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("participants")
        .select("id, name, email, data")
        .eq("book_id", bookId)
        .order("name", { ascending: true }),
    ]);

    if (bookRes.error || fieldsRes.error || partsRes.error) {
      setError(
        bookRes.error?.message ||
          fieldsRes.error?.message ||
          partsRes.error?.message ||
          "Gagal memuat data."
      );
    } else {
      const b = bookRes.data as BookRow | null;
      setBook(
        b
          ? {
              id: b.id,
              name: b.name,
              folderId: b.folder_id,
              createdDate: b.created_at ? dateToStr(new Date(b.created_at)) : null,
            }
          : null
      );
      setFields(((fieldsRes.data ?? []) as FieldRow[]).map(toField));
      setParticipants(((partsRes.data ?? []) as ParticipantRow[]).map(toParticipant));
    }

    setLoading(false);
  }, [supabase, bookId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Muat absensi untuk tanggal terpilih
  useEffect(() => {
    dateRef.current = date;
    if (!bookId || !date) return;
    let cancelled = false;

    (async () => {
      setAtt({});
      setAttLoading(true);
      const { data, error } = await supabase
        .from("attendance")
        .select("participant_id, status, catatan")
        .eq("book_id", bookId)
        .eq("tanggal", date);

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setAtt({});
      } else {
        const map: Record<string, AttRecord> = {};
        for (const r of (data ?? []) as AttendanceRow[]) {
          map[r.participant_id] = { status: r.status, catatan: r.catatan };
        }
        setAtt(map);
      }
      setAttLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, bookId, date]);

  // Escape menutup dialog
  useEffect(() => {
    if (!addOpen && !fieldsOpen && !deleting && !dateOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAddOpen(false);
        setFieldsOpen(false);
        setDateOpen(false);
        if (!deleteBusy) setDeleting(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addOpen, fieldsOpen, deleting, deleteBusy, dateOpen]);

  const visibleParticipants = useMemo(() => {
    if (!q) return participants;
    return participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        Object.values(p.data).some((v) => v.toLowerCase().includes(q))
    );
  }, [participants, q]);

  const summary = useMemo(() => {
    const counts: Record<Status, number> = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
    let filled = 0;
    for (const p of participants) {
      const r = att[p.id];
      if (r) {
        counts[r.status] += 1;
        filled += 1;
      }
    }
    return { counts, unfilled: participants.length - filled };
  }, [participants, att]);

  // ---------- Navigasi tanggal ----------
  function goDay(n: number) {
    const next = addDays(date, n);
    if (!ALLOW_FUTURE && next > todayStr()) return;
    setDate(next);
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchEnd(e: React.TouchEvent) {
    const s = touchStart.current;
    touchStart.current = null;
    if (!s) return;
    if ((e.target as Element).closest("input, textarea")) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) < 80 || Math.abs(dy) > 50) return;
    // Geser ke kanan = lembar sebelumnya, ke kiri = lembar berikutnya
    goDay(dx > 0 ? -1 : 1);
  }

  async function loadDateCounts() {
    const counts: Record<string, number> = {};
    const size = 1000;
    for (let from = 0; ; from += size) {
      const { data, error } = await supabase
        .from("attendance")
        .select("tanggal")
        .eq("book_id", bookId)
        .order("tanggal", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + size - 1);

      if (error) {
        setError(error.message);
        break;
      }
      for (const r of (data ?? []) as { tanggal: string }[]) {
        counts[r.tanggal] = (counts[r.tanggal] ?? 0) + 1;
      }
      if (!data || data.length < size) break;
    }
    setDateCounts(counts);
  }

  function openDatePicker() {
    setPickerMonth(null);
    setDateOpen(true);
    loadDateCounts();
  }

  function pickDate(s: string) {
    setDate(s);
    setDateOpen(false);
  }

  // Daftar bulan (terbaru di atas) dari bulan buku dibuat / catatan paling awal sampai bulan ini
  const monthList = useMemo(() => {
    const todayM = todayStr().slice(0, 7);
    const all: string[] = [todayM, date.slice(0, 7)];
    if (book?.createdDate) all.push(book.createdDate.slice(0, 7));
    if (dateCounts) for (const k of Object.keys(dateCounts)) all.push(k.slice(0, 7));

    const start = all.reduce((a, b) => (a < b ? a : b));
    const end = all.reduce((a, b) => (a > b ? a : b));

    const out: string[] = [];
    let [y, m] = end.split("-").map(Number);
    const [sy, sm] = start.split("-").map(Number);
    while ((y > sy || (y === sy && m >= sm)) && out.length < 600) {
      out.push(`${y}-${pad(m)}`);
      m -= 1;
      if (m === 0) {
        m = 12;
        y -= 1;
      }
    }
    return out;
  }, [book, date, dateCounts]);

  // Jumlah hari yang punya catatan di tiap bulan
  const monthDays = useMemo(() => {
    const r: Record<string, number> = {};
    if (dateCounts) {
      for (const k of Object.keys(dateCounts)) {
        const mk = k.slice(0, 7);
        r[mk] = (r[mk] ?? 0) + 1;
      }
    }
    return r;
  }, [dateCounts]);

  // Daftar hari pada bulan yang dibuka (terbaru di atas)
  const dayList = useMemo(() => {
    if (!pickerMonth) return [];
    const t = todayStr();
    const out: string[] = [];
    for (let d = daysInMonth(pickerMonth); d >= 1; d--) {
      const s = `${pickerMonth}-${pad(d)}`;
      if (!ALLOW_FUTURE && s > t) continue;
      out.push(s);
    }
    return out;
  }, [pickerMonth]);

  // Gulirkan ke item terpilih saat modal tanggal dibuka / berpindah tampilan
  useEffect(() => {
    if (!dateOpen) return;
    const el = pickerListRef.current?.querySelector('[data-selected="true"]');
    if (el) (el as HTMLElement).scrollIntoView({ block: "center" });
  }, [dateOpen, pickerMonth, monthList.length]);

  // ---------- Absensi ----------
  // Ketuk status; ketuk status yang sama lagi untuk mengosongkan
  async function setStatus(p: Participant, status: Status) {
    const day = date;
    const prev = att[p.id];
    const clearing = prev?.status === status;

    setError(null);
    setAtt((m) => {
      const next = { ...m };
      if (clearing) delete next[p.id];
      else next[p.id] = { status, catatan: status === "izin" ? prev?.catatan ?? null : null };
      return next;
    });

    const restore = () => {
      if (dateRef.current !== day) return;
      setAtt((m) => {
        const next = { ...m };
        if (prev) next[p.id] = prev;
        else delete next[p.id];
        return next;
      });
    };

    if (clearing) {
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("book_id", bookId)
        .eq("participant_id", p.id)
        .eq("tanggal", day);
      if (error) {
        restore();
        setError(error.message);
      }
      return;
    }

    const { error } = await supabase.from("attendance").upsert(
      {
        book_id: bookId,
        participant_id: p.id,
        tanggal: day,
        status,
        catatan: status === "izin" ? prev?.catatan ?? null : null,
      },
      { onConflict: "book_id,participant_id,tanggal" }
    );
    if (error) {
      restore();
      setError(error.message);
    }
  }

  function changeNote(p: Participant, text: string) {
    setAtt((m) => {
      const cur = m[p.id];
      if (!cur) return m;
      return { ...m, [p.id]: { ...cur, catatan: text } };
    });
  }

  async function saveNote(p: Participant) {
    const cur = att[p.id];
    if (!cur || cur.status !== "izin") return;
    const value = (cur.catatan ?? "").trim();

    const { error } = await supabase
      .from("attendance")
      .update({ catatan: value || null })
      .eq("book_id", bookId)
      .eq("participant_id", p.id)
      .eq("tanggal", date);

    if (error) setError(error.message);
    else changeNote(p, value);
  }

  // ---------- Tambah peserta ----------
  function openAdd() {
    setPName("");
    setPEmail("");
    setPData({});
    setAddOpen(true);
  }

  async function submitParticipant(e: React.FormEvent) {
    e.preventDefault();
    const nameValue = pName.trim();
    if (!nameValue || addBusy) return;

    const data: Record<string, string> = {};
    for (const f of fields) {
      const v = (pData[f.key] ?? "").trim();
      if (v) data[f.key] = v;
    }

    setAddBusy(true);
    setError(null);

    const { data: row, error } = await supabase
      .from("participants")
      .insert({
        book_id: bookId,
        name: nameValue,
        email: pEmail.trim() || null,
        data,
      })
      .select("id, name, email, data")
      .single();

    if (error) {
      setError(
        error.code === "23505"
          ? "Email itu sudah dipakai peserta lain di buku ini."
          : error.message
      );
    } else if (row) {
      setParticipants((list) =>
        [...list, toParticipant(row as ParticipantRow)].sort((a, b) =>
          a.name.localeCompare(b.name, "id")
        )
      );
      setAddOpen(false);
    }

    setAddBusy(false);
  }

  // ---------- Hapus peserta ----------
  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    const target = deleting;

    setDeleteBusy(true);
    setError(null);

    const { data, error } = await supabase
      .from("participants")
      .delete()
      .eq("id", target.id)
      .select("id");

    if (error || !data || data.length === 0) {
      setError(error?.message ?? "Gagal menghapus peserta.");
    } else {
      setParticipants((list) => list.filter((p) => p.id !== target.id));
      setAtt((m) => {
        const next = { ...m };
        delete next[target.id];
        return next;
      });
    }

    setDeleteBusy(false);
    setDeleting(null);
  }

  // ---------- Kelola kolom kustom ----------
  async function addField(e: React.FormEvent) {
    e.preventDefault();
    const label = fLabel.trim();
    if (!label || fieldBusy) return;

    const key = slugify(label);
    if (!key) {
      setError("Nama kolom harus mengandung huruf atau angka.");
      return;
    }
    if (fields.some((f) => f.key === key)) {
      setError("Kolom dengan nama itu sudah ada.");
      return;
    }

    setFieldBusy(true);
    setError(null);

    const nextOrder = fields.length ? Math.max(...fields.map((f) => f.sortOrder)) + 1 : 0;
    const { data, error } = await supabase
      .from("participant_fields")
      .insert({ book_id: bookId, key, label, sort_order: nextOrder })
      .select("id, key, label, sort_order")
      .single();

    if (error) {
      setError(error.message);
    } else if (data) {
      setFields((list) => [...list, toField(data as FieldRow)]);
      setFLabel("");
    }

    setFieldBusy(false);
  }

  async function removeField(f: Field) {
    if (fieldBusy) return;
    if (
      !window.confirm(
        `Hapus kolom "${f.label}"? Isi kolom ini pada semua peserta ikut terhapus.`
      )
    )
      return;

    setFieldBusy(true);
    setError(null);

    const { data, error } = await supabase
      .from("participant_fields")
      .delete()
      .eq("id", f.id)
      .select("id");

    if (error || !data || data.length === 0) {
      setError(error?.message ?? "Gagal menghapus kolom.");
    } else {
      setFields((list) => list.filter((x) => x.id !== f.id));
      // Trigger di database sudah membersihkan data peserta; samakan tampilan lokal
      setParticipants((list) =>
        list.map((p) => {
          if (!(f.key in p.data)) return p;
          const next = { ...p.data };
          delete next[f.key];
          return { ...p, data: next };
        })
      );
    }

    setFieldBusy(false);
  }

  function extraInfo(p: Participant) {
    const parts: string[] = [];
    if (p.email) parts.push(p.email);
    for (const f of fields) {
      const v = p.data[f.key];
      if (v) parts.push(`${f.label}: ${v}`);
    }
    return parts.join(" • ");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-white" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900">
        <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-base font-semibold">Buku tidak ditemukan</h1>
          <p className="mt-1 text-sm text-slate-500">
            {error ?? "Buku ini mungkin sudah dihapus."}
          </p>
          <Link
            href={HOME_HREF}
            className="mt-5 inline-block rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const rel = relativeLabel(date);
  const nextDisabled = !ALLOW_FUTURE && date >= today;
  const selectedMonth = date.slice(0, 7);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main
        className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6 sm:pt-6"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Bagian atas: kembali + judul + aksi */}
        <div className="flex items-center gap-2">
          <Link
            href={HOME_HREF}
            aria-label="Kembali"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft />
          </Link>

          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold sm:text-xl">{book.name}</h1>

          <button
            type="button"
            onClick={() => setFieldsOpen(true)}
            aria-label="Kelola kolom peserta"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ColumnsIcon />
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Peserta</span>
          </button>
        </div>

        {/* Pesan galat */}
        {error && (
          <div
            role="alert"
            className="mt-4 flex items-start justify-between gap-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="shrink-0 cursor-pointer font-medium hover:underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Lembar tanggal + ringkasan */}
        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goDay(-1)}
              aria-label="Hari sebelumnya"
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft />
            </button>

            <button
              type="button"
              onClick={openDatePicker}
              aria-haspopup="dialog"
              aria-label="Pilih tanggal"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 px-3 py-2 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarIcon />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{fmtFull(date)}</p>
                <p className="truncate text-xs text-slate-500">
                  {rel ? `${rel} · ketuk untuk memilih tanggal` : "Ketuk untuk memilih tanggal"}
                </p>
              </div>
              <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => goDay(1)}
              disabled={nextDisabled}
              aria-label="Hari berikutnya"
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-600"
            >
              <ChevronRight />
            </button>
          </div>

          {date !== today && (
            <button
              type="button"
              onClick={() => setDate(todayStr())}
              className="mt-3 cursor-pointer rounded-full bg-blue-50 px-3.5 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Kembali ke hari ini
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
            {STATUSES.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[s]}`} />
                {STATUS_LABEL[s]} <span className="font-semibold text-slate-800">{summary.counts[s]}</span>
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
              Belum diisi <span className="font-semibold text-slate-800">{summary.unfilled}</span>
            </span>
          </div>
        </div>

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
        {visibleParticipants.length > 0 ? (
          <ul className={`mt-4 space-y-3 ${attLoading ? "opacity-60" : ""}`}>
            {visibleParticipants.map((p) => {
              const rec = att[p.id];
              const info = extraInfo(p);
              return (
                <li key={p.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      {info && <p className="truncate text-sm text-slate-500">{info}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleting(p)}
                      aria-label={`Hapus ${p.name}`}
                      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {STATUSES.map((s) => {
                      const active = rec?.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(p, s)}
                          disabled={attLoading}
                          aria-pressed={active}
                          className={`cursor-pointer rounded-2xl border py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed ${
                            active
                              ? STATUS_ACTIVE[s]
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      );
                    })}
                  </div>

                  {rec?.status === "izin" && (
                    <input
                      value={rec.catatan ?? ""}
                      onChange={(e) => changeNote(p, e.target.value)}
                      onBlur={() => saveNote(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      }}
                      placeholder="Catatan izin (opsional)"
                      className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="text-base font-semibold">
              {q ? "Tidak ada hasil" : "Belum ada peserta"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {q
                ? "Coba kata kunci lain."
                : "Tambahkan peserta lewat tombol di kanan atas, lalu mulai catat kehadiran."}
            </p>
          </div>
        )}
      </main>

      {/* Dialog pilih tanggal: folder bulan -> hari */}
      {dateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          onClick={() => setDateOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="date-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-xl"
          >
            {pickerMonth ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPickerMonth(null)}
                  aria-label="Kembali ke daftar bulan"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <ChevronLeft />
                </button>
                <h2 id="date-title" className="min-w-0 flex-1 truncate text-lg font-semibold">
                  {monthName(pickerMonth)} {pickerMonth.slice(0, 4)}
                </h2>
              </div>
            ) : (
              <div>
                <h2 id="date-title" className="text-lg font-semibold">
                  Pilih tanggal
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Buka folder bulan, lalu pilih harinya.
                </p>
              </div>
            )}

            <div
              ref={pickerListRef}
              className="mt-4 min-h-[10rem] flex-1 overflow-y-auto rounded-2xl border border-slate-200"
            >
              {!pickerMonth ? (
                dateCounts === null ? (
                  <div className="space-y-2 p-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : (
                  <ul>
                    {monthList.map((mk, i) => {
                      const year = mk.slice(0, 4);
                      const showYear = i === 0 || monthList[i - 1].slice(0, 4) !== year;
                      const days = monthDays[mk] ?? 0;
                      const isSelected = mk === selectedMonth;
                      return (
                        <li key={mk}>
                          {showYear && (
                            <p className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {year}
                            </p>
                          )}
                          <button
                            type="button"
                            data-selected={isSelected}
                            onClick={() => setPickerMonth(mk)}
                            className={`flex w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 ${
                              isSelected ? "bg-blue-50/60" : ""
                            }`}
                          >
                            <FolderIcon className="h-6 w-6 shrink-0 text-blue-600" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium capitalize text-slate-800">
                                {monthName(mk)}
                              </p>
                              <p className="truncate text-xs text-slate-500">
                                {days > 0 ? `${days} hari tercatat` : "Belum ada catatan"}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                Dibuka
                              </span>
                            )}
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                <ul>
                  {dayList.map((s) => {
                    const isSelected = s === date;
                    const isToday = s === today;
                    const count = dateCounts?.[s] ?? 0;
                    return (
                      <li key={s}>
                        <button
                          type="button"
                          data-selected={isSelected}
                          onClick={() => pickDate(s)}
                          className={`flex w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left focus:outline-none focus-visible:bg-slate-50 ${
                            isSelected ? "bg-blue-50 hover:bg-blue-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : isToday
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {Number(s.slice(8, 10))}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-800">
                              {fmtWeekday(s)}
                              {isToday && (
                                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  Hari ini
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-slate-500">{fmtLongDate(s)}</p>
                          </div>
                          <span
                            className={`shrink-0 text-xs ${
                              count > 0 ? "font-medium text-emerald-700" : "text-slate-400"
                            }`}
                          >
                            {count > 0 ? `${count} tercatat` : "Kosong"}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <label htmlFor="jump-date" className="block text-xs font-medium text-slate-500">
                Atau lompat langsung ke tanggal
              </label>
              <input
                id="jump-date"
                type="date"
                max={ALLOW_FUTURE ? undefined : today}
                value={date}
                onChange={(e) => e.target.value && pickDate(e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => pickDate(todayStr())}
                className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Hari ini
              </button>
              <button
                type="button"
                onClick={() => setDateOpen(false)}
                className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog tambah peserta */}
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          onClick={() => setAddOpen(false)}
          role="presentation"
        >
          <form
            onSubmit={submitParticipant}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-title"
            className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-xl"
          >
            <h2 id="add-title" className="text-lg font-semibold">
              Peserta baru
            </h2>

            <div className="mt-4 flex-1 space-y-4 overflow-y-auto px-0.5 pb-1">
              <div>
                <label htmlFor="p-name" className="block text-sm font-medium text-slate-700">
                  Nama
                </label>
                <input
                  id="p-name"
                  autoFocus
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label htmlFor="p-email" className="block text-sm font-medium text-slate-700">
                  Email <span className="font-normal text-slate-400">(opsional)</span>
                </label>
                <input
                  id="p-email"
                  type="email"
                  value={pEmail}
                  onChange={(e) => setPEmail(e.target.value)}
                  placeholder="nama@contoh.com"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {fields.map((f) => (
                <div key={f.id}>
                  <label htmlFor={`pf-${f.id}`} className="block text-sm font-medium text-slate-700">
                    {f.label}
                  </label>
                  <input
                    id={`pf-${f.id}`}
                    value={pData[f.key] ?? ""}
                    onChange={(e) => setPData((d) => ({ ...d, [f.key]: e.target.value }))}
                    className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!pName.trim() || addBusy}
                className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {addBusy ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dialog kelola kolom */}
      {fieldsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          onClick={() => setFieldsOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="fields-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-xl"
          >
            <h2 id="fields-title" className="text-lg font-semibold">
              Kolom peserta
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tambah data tambahan untuk peserta, misalnya NIS, kelas, atau nomor HP.
            </p>

            <div className="mt-4 min-h-[6rem] flex-1 overflow-y-auto rounded-2xl border border-slate-200">
              {fields.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">Belum ada kolom.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {fields.map((f) => (
                    <li key={f.id} className="flex items-center gap-2 px-4 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                        {f.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeField(f)}
                        disabled={fieldBusy}
                        aria-label={`Hapus kolom ${f.label}`}
                        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <form onSubmit={addField} className="mt-4 flex gap-2">
              <input
                value={fLabel}
                onChange={(e) => setFLabel(e.target.value)}
                placeholder="Nama kolom, contoh: NIS"
                className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={!fLabel.trim() || fieldBusy}
                className="shrink-0 cursor-pointer rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Tambah
              </button>
            </form>

            <button
              type="button"
              onClick={() => setFieldsOpen(false)}
              className="mt-3 w-full cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Selesai
            </button>
          </div>
        </div>
      )}

      {/* Dialog hapus peserta */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          onClick={() => {
            if (!deleteBusy) setDeleting(null);
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
              <span className="font-medium text-slate-700">&quot;{deleting.name}&quot;</span> beserta seluruh
              riwayat absensinya akan dihapus permanen. Tindakan ini tidak dapat diurungkan.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={deleteBusy}
                className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleteBusy}
                className="flex-1 cursor-pointer rounded-2xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {deleteBusy ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
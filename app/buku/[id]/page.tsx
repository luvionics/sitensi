"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import type { Field, Participant } from "./components/types";
import {
  STATUSES,
  STATUS_ACTIVE,
  STATUS_DOT,
  STATUS_LABEL,
  emptyCounts,
  type Status,
} from "./components/status";
import {
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DownloadIcon,
  DocumentIcon,
  PlusIcon,
  ReorderIcon,
  SearchIcon,
  ShareIcon,
  UploadIcon,
} from "./components/icons";
import ReorderParticipantsModal from "./components/ReorderParticipantsModal";
import AddMenuModal, { type MenuFeature } from "./components/AddMenuModal";
import DatePickerModal from "./components/DatePickerModal";
import ParticipantFormModal from "./components/ParticipantFormModal";
import ParticipantActionModal from "./components/ParticipantActionModal";
import ParticipantDetailModal from "./components/ParticipantDetailModal";
import FieldsModal from "./components/FieldsModal";
import ConfirmModal from "./components/ConfirmModal";
import Toast from "./components/Toast";
import ShareModal from "./components/ShareModal";
import ShareRecapSheet from "./components/ShareRecapSheet";
import ParticipantImportModal from "./components/ParticipantImportModal";
import ParticipantExportModal from "./components/ParticipantExportModal";
import ParticipantRecapSheet from "./components/ParticipantRecapSheet";

// Tujuan tombol kembali dari halaman buku.
// Buku yang berada di folder kembali ke folder itu; buku tanpa folder kembali ke beranda.
// Sesuaikan rute folder dengan struktur app kamu.
const HOME_HREF = "/";
const folderHref = (folderId: string | null) => (folderId ? `/folder/${folderId}` : HOME_HREF);

// false = tidak bisa maju melewati hari ini. Ubah ke true bila ingin boleh mengisi tanggal mendatang.
const ALLOW_FUTURE = false;

// Lama toast tampil (ms)
const TOAST_MS = 4000;
// Jeda sebelum catatan disimpan otomatis setelah berhenti mengetik (ms)
const NOTE_DEBOUNCE_MS = 800;
// Lama tulisan "Tersimpan" tampil (ms)
const SAVED_MS = 2500;
const PARTICIPANT_PAGE_SIZE = 50;
const PARTICIPANT_REORDER_PAGE_SIZE = 1000;
const SEARCH_DEBOUNCE_MS = 300;
const ATTENDANCE_DEBOUNCE_MS = 300;
const ATTENDANCE_CACHE_LIMIT = 7;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Book = { id: string; name: string; folderId: string | null; createdDate: string | null; shareEnabled: boolean; shareToken: string };
type AttRecord = { status: Status; catatan: string | null };
type SaveUi = "saving" | "saved";
type ConfirmState =
  | { kind: "participant"; participant: Participant }
  | { kind: "field"; field: Field };

type BookRow = { id: string; name: string; folder_id: string | null; created_at: string | null; share_enabled: boolean; share_token: string };
type FieldRow = { id: string; key: string; label: string; sort_order: number };
type ParticipantRow = { id: string; name: string; email: string | null; data: unknown; sort_order: number };
type AttendanceRow = { participant_id: string; status: Status; catatan: string | null };

type DbError = { code?: string; message: string; status?: number; statusCode?: number };

// Ubah kode galat Postgres / PostgREST menjadi pesan yang mudah dipahami
function friendlyError(error: DbError): string {
  switch (error.code) {
    case "42501":
      return "Akses ditolak. Sesi Anda mungkin sudah berakhir, silakan masuk lagi.";
    case "PGRST116":
      return "Data tidak ditemukan atau Anda tidak punya akses ke data ini.";
    case "22P02":
      return "Format data tidak valid.";
    case "23503":
      return "Data terkait tidak ditemukan. Muat ulang halaman lalu coba lagi.";
    case "23514":
      return "Data tidak memenuhi aturan di database.";
    default:
      return error.message || "Terjadi kesalahan. Coba lagi.";
  }

}

function isRangeNotSatisfiable(error: DbError): boolean {
  return error.status === 416 ||
    error.statusCode === 416 ||
    error.code === "PGRST103" ||
    error.message.toLowerCase().includes("requested range not satisfiable");
}

const DUPLICATE_EMAIL_MSG = "Email itu sudah dipakai peserta lain di buku ini.";
const DUPLICATE_FIELD_MSG = "Kolom dengan nama itu sudah ada.";

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
  return { id: r.id, name: r.name, email: r.email, data, sortOrder: r.sort_order };
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

// Hasilnya selalu cocok dengan CHECK participant_fields_key_check: ^[a-z0-9_]+$
function slugify(label: string) {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function BukuAbsensiContent() {
  const supabase = useMemo(() => createClient(), []);
  const { id: bookId } = useParams<{ id: string }>();
  const bookValid = typeof bookId === "string" && UUID_RE.test(bookId);

  const [book, setBook] = useState<Book | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [att, setAtt] = useState<Record<string, AttRecord>>({});
  const [saveUi, setSaveUi] = useState<Record<string, SaveUi>>({});
  const inflight = useRef<Record<string, number>>({});
  const savedTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingNotes = useRef<Record<string, { day: string; value: string }>>({});

  const [loading, setLoading] = useState(true);
  const [attLoading, setAttLoading] = useState(false);
  const [totalPeserta, setTotalPeserta] = useState(0);
  const [totalHasilCari, setTotalHasilCari] = useState(0);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [hasMoreParticipants, setHasMoreParticipants] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const participantSentinelRef = useRef<HTMLDivElement | null>(null);
  const participantsLoadingRef = useRef(false);
  const participantListPageRef = useRef(0);
  const participantLoadedCountRef = useRef(0);
  const participantGenerationRef = useRef(0);
  const participantSearchRef = useRef(0);
  const participantInitialLoadRef = useRef(false);
  const participantInitialSearchRef = useRef(false);
  const attendanceCache = useRef(new Map<string, Record<string, AttRecord>>());
  const attendanceRequestRef = useRef(0);
  const [attendanceReloadNonce, setAttendanceReloadNonce] = useState(0);

  // Notifikasi (toast): galat dan keberhasilan
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  // Modal aksi peserta (edit / hapus + total status)
  const [actionTarget, setActionTarget] = useState<Participant | null>(null);
  const [stats, setStats] = useState<Record<Status, number> | null>(null);
  const actionIdRef = useRef<string | null>(null);

  // Modal tambah / edit peserta (satu form dipakai bersama)
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pName, setPName] = useState("");
  const [pEmail, setPEmail] = useState("");
  const [pData, setPData] = useState<Record<string, string>>({});
  const [formBusy, setFormBusy] = useState(false);

  // Modal kelola kolom
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [fLabel, setFLabel] = useState("");
  const [fieldBusy, setFieldBusy] = useState(false);
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editFieldLabel, setEditFieldLabel] = useState("");

  // Modal konfirmasi hapus (peserta / kolom)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Modal menu tambah (tombol + di header)
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [recapShareOpen, setRecapShareOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [recapParticipant, setRecapParticipant] = useState<Participant | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const detailTarget = detailId ? participants.find((p) => p.id === detailId) ?? null : null;

  useEffect(() => {
    if (!detailId) return;
    let cancelled = false;
    void supabase.from("participant_fields").select("id, key, label, sort_order").eq("book_id", bookId).order("sort_order")
      .then(({ data }) => {
        if (!cancelled && data) setFields((data as FieldRow[]).map(toField));
      });
    void supabase
      .from("participants")
      .select("id, name, email, data, sort_order")
      .eq("id", detailId)
      .eq("book_id", bookId)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(friendlyError(error));
          return;
        }
        if (data) {
          const participant = toParticipant(data as ParticipantRow);
          setParticipants((list) => list.map((p) => p.id === participant.id ? participant : p));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [detailId, supabase, bookId]);

  // Fitur tambahan di menu. Tanpa `onClick` = belum tersedia (tampil "Segera").
  const extraFeatures: MenuFeature[] = [
    {
      id: "share",
      title: "Bagikan pendaftaran buku absen",
      description: "Peserta bisa mendaftar dan mengisi datanya sendiri lewat tautan.",
      icon: <ShareIcon className="h-5 w-5" />,
      onClick: () => {
        setMenuOpen(false);
        setShareOpen(true);
      },
    },
    {
      id: "share-recap",
      title: "Bagikan rekap buku absen",
      description: "Kirim rekap seluruh peserta lewat email atau tautan.",
      icon: <DocumentIcon className="h-5 w-5" />,
      onClick: () => {
        setMenuOpen(false);
        setRecapParticipant(null);
        setRecapShareOpen(true);
      },
    },
    {
      id: "reorder",
      title: "Atur urutan peserta",
      description: "Ubah urutan peserta di daftar absensi dengan menyeret.",
      icon: <ReorderIcon className="h-5 w-5" />,
      onClick: () => {
        setMenuOpen(false);
        void openReorder();
      },
    },
    {
      id: "import",
      title: "Impor dari Excel/CSV",
      description: "Tambah banyak peserta sekaligus dari satu file.",
      icon: <UploadIcon className="h-5 w-5" />,
      onClick: () => { setMenuOpen(false); setImportOpen(true); },
    },
    {
      id: "export",
      title: "Ekspor rekap absensi",
      description: "Unduh rekap kehadiran per tanggal atau per peserta.",
      icon: <DownloadIcon className="h-5 w-5" />,
      onClick: () => { setMenuOpen(false); setExportOpen(true); },
    },
  ];

  function clearUi(id: string) {
    setSaveUi((m) => {
      if (!(id in m)) return m;
      const next = { ...m };
      delete next[id];
      return next;
    });
  }

  function beginSave(id: string) {
    clearTimeout(savedTimers.current[id]);
    inflight.current[id] = (inflight.current[id] ?? 0) + 1;
    setSaveUi((m) => ({ ...m, [id]: "saving" }));
  }

  function endSave(id: string, ok: boolean) {
    inflight.current[id] = Math.max(0, (inflight.current[id] ?? 1) - 1);
    if (inflight.current[id] > 0) return;
    if (pendingNotes.current[id]) return;
    if (!ok) {
      clearUi(id);
      return;
    }
    setSaveUi((m) => ({ ...m, [id]: "saved" }));
    clearTimeout(savedTimers.current[id]);
    savedTimers.current[id] = setTimeout(() => clearUi(id), SAVED_MS);
  }

  async function flushNote(id: string) {
    const pending = pendingNotes.current[id];
    if (!pending) return;
    delete pendingNotes.current[id];
    clearTimeout(noteTimers.current[id]);
    const value = pending.value.trim() || null;

    beginSave(id);
    const { error } = await supabase.from("attendance").upsert(
      { book_id: bookId, participant_id: id, tanggal: pending.day, status: "izin", catatan: value },
      { onConflict: "book_id,participant_id,tanggal" }
    );

    if (error) setError(friendlyError(error));
    else {
      const cachedDay = attendanceCache.current.get(pending.day);
      if (cachedDay) attendanceCache.current.set(pending.day, {
        ...cachedDay,
        [id]: { status: "izin", catatan: value },
      });
    }
    endSave(id, !error);
  }

  function flushAllNotes() {
    for (const id of Object.keys(pendingNotes.current)) void flushNote(id);
  }

  // Sedang menyimpan urutan kolom
  const [orderBusy, setOrderBusy] = useState(false);
  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderBusy, setReorderBusy] = useState(false);
  const [reorderParticipantList, setReorderParticipantList] = useState<Participant[]>([]);

  const q = query.trim();
  const today = todayStr();

  function escapeSearch(value: string) {
    return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
  }

  const fetchParticipantPage = useCallback(async (
    page: number,
    search = ""
  ): Promise<{ rows: Participant[] | null; total: number | null; error: DbError | null }> => {
    const from = page * PARTICIPANT_PAGE_SIZE;
    let request = supabase
      .from("participants")
      .select("id, name, sort_order", { count: "exact" })
      .eq("book_id", bookId);
    const searchValue = search.trim();
    if (searchValue) request = request.ilike("name", `%${escapeSearch(searchValue)}%`);
    const { data, error, count } = await request
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PARTICIPANT_PAGE_SIZE - 1);
    if (error) return { rows: null, total: null, error };
    return {
      rows: ((data ?? []) as ParticipantRow[]).map(toParticipant),
      total: count ?? 0,
      error: null,
    };
  }, [supabase, bookId]);

  async function refreshParticipantList(search = q, retryRange = false) {
    const generation = ++participantGenerationRef.current;
    participantsLoadingRef.current = false;
    participantListPageRef.current = 0;
    participantLoadedCountRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticipants([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMoreParticipants(false);

    const result = await fetchParticipantPage(0, search);
    if (generation !== participantGenerationRef.current) return null;
    if (result.error && isRangeNotSatisfiable(result.error)) {
      setHasMoreParticipants(false);
      if (!retryRange) return refreshParticipantList(search, true);
      return null;
    }
    if (result.error || !result.rows) return null;
    let rows = result.rows;
    if (result.total !== null && result.total <= 60 && rows.length < result.total) {
      const secondPage = await fetchParticipantPage(1, search);
      if (!secondPage.error && secondPage.rows) rows = [...rows, ...secondPage.rows];
    }
    setParticipants(rows);
    participantLoadedCountRef.current = rows.length;
    participantListPageRef.current = rows.length >= PARTICIPANT_PAGE_SIZE ? 1 : 0;
    if (result.total !== null) {
      setHasMoreParticipants(rows.length < result.total);
    }
    return rows;
  }

  async function reloadParticipants() {
    return refreshParticipantList(q);
  }

  async function refreshParticipantTotal() {
    const { count, error } = await supabase
      .from("participants")
      .select("id", { count: "exact", head: true })
      .eq("book_id", bookId);
    if (!error && count !== null) setTotalPeserta(count);
  }

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Alamat bukan UUID: langsung dianggap tidak ditemukan, tanpa memanggil database
    if (!bookValid) {
      setBook(null);
      setLoading(false);
      return;
    }

    const [bookRes, fieldsRes] = await Promise.all([
      supabase
        .from("books")
        .select("id, name, folder_id, created_at, share_enabled, share_token")
        .eq("id", bookId)
        .maybeSingle(),
      supabase
        .from("participant_fields")
        .select("id, key, label, sort_order")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    ]);
    const participantsRes = await fetchParticipantPage(0);
    let initialParticipantRows = participantsRes.rows ?? [];
    if (!participantsRes.error && participantsRes.total !== null && participantsRes.total <= 60 && initialParticipantRows.length < participantsRes.total) {
      const secondPage = await fetchParticipantPage(1);
      if (!secondPage.error && secondPage.rows) initialParticipantRows = [...initialParticipantRows, ...secondPage.rows];
    }

    const firstError = bookRes.error ?? fieldsRes.error ?? participantsRes.error;
    if (firstError) {
      setError(friendlyError(firstError));
    } else {
      const b = bookRes.data as BookRow | null;
      setBook(
        b
          ? {
              id: b.id,
              name: b.name,
              folderId: b.folder_id,
              createdDate: b.created_at ? dateToStr(new Date(b.created_at)) : null,
              shareEnabled: b.share_enabled,
              shareToken: b.share_token,
            }
          : null
      );
      setFields(((fieldsRes.data ?? []) as FieldRow[]).map(toField));
      setParticipants(initialParticipantRows);
      participantGenerationRef.current += 1;
      participantLoadedCountRef.current = initialParticipantRows.length;
      if (participantsRes.total !== null) {
        setTotalPeserta(participantsRes.total);
        setTotalHasilCari(query.trim() ? participantsRes.total : 0);
        setHasMoreParticipants(initialParticipantRows.length < participantsRes.total);
      }
      participantListPageRef.current = initialParticipantRows.length >= PARTICIPANT_PAGE_SIZE ? 1 : 0;
    }

    setLoading(false);
  }, [supabase, bookId, bookValid, fetchParticipantPage]);

  useEffect(() => {
    if (participantInitialLoadRef.current) return;
    participantInitialLoadRef.current = true;
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const search = q.trim();
    const requestId = ++participantSearchRef.current;
    if (!search) {
      if (!participantInitialSearchRef.current) {
        participantInitialSearchRef.current = true;
        return;
      }
      setTotalHasilCari(0);
      void refreshParticipantList("");
      return;
    }
    const generation = ++participantGenerationRef.current;
    participantsLoadingRef.current = false;
    participantListPageRef.current = 0;
    participantLoadedCountRef.current = 0;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticipants([]);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasMoreParticipants(false);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      const result = await fetchParticipantPage(0, search);
      if (requestId !== participantSearchRef.current || generation !== participantGenerationRef.current) return;
      if (result.error && isRangeNotSatisfiable(result.error)) {
        setHasMoreParticipants(false);
        setSearchLoading(false);
        void refreshParticipantList(search, true);
        return;
      }
      if (result.error || !result.rows) {
        setError(result.error ? friendlyError(result.error) : "Peserta gagal dimuat.");
        setParticipants([]);
        setHasMoreParticipants(false);
      } else {
        let rows = result.rows;
        if ((result.total ?? 0) <= 60 && rows.length < (result.total ?? 0)) {
          const secondPage = await fetchParticipantPage(1, search);
          if (!secondPage.error && secondPage.rows) rows = [...rows, ...secondPage.rows];
        }
        setParticipants(rows);
        participantLoadedCountRef.current = rows.length;
        participantListPageRef.current = rows.length >= PARTICIPANT_PAGE_SIZE ? 1 : 0;
        setTotalHasilCari(result.total ?? rows.length);
        setHasMoreParticipants((rows.length < (result.total ?? rows.length)));
      }
      setSearchLoading(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [q, fetchParticipantPage]);

  useEffect(() => {
    const sentinel = participantSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(async (entries) => {
      if (!entries[0]?.isIntersecting || participantsLoadingRef.current) return;
      const total = q.trim() ? totalHasilCari : totalPeserta;
      if (participantLoadedCountRef.current >= total) return;
      participantsLoadingRef.current = true;
      setParticipantsLoading(true);
      const generation = participantGenerationRef.current;
      const page = participantLoadedCountRef.current;
      const result = await fetchParticipantPage(Math.floor(page / PARTICIPANT_PAGE_SIZE), q);
      if (generation !== participantGenerationRef.current) {
        participantsLoadingRef.current = false;
        setParticipantsLoading(false);
        return;
      }
      if (result.rows && !result.error) {
        const rows = result.rows;
        setParticipants((current) => {
          const ids = new Set(current.map((p) => p.id));
          return [...current, ...rows.filter((p) => !ids.has(p.id))];
        });
        participantLoadedCountRef.current += rows.length;
        participantListPageRef.current += 1;
        setHasMoreParticipants(participantLoadedCountRef.current < (result.total ?? total));
      } else if (result.error) {
        if (isRangeNotSatisfiable(result.error)) {
          setHasMoreParticipants(false);
          void refreshParticipantList(q);
        } else {
          setError(friendlyError(result.error));
        }
      }
      participantsLoadingRef.current = false;
      setParticipantsLoading(false);
    }, { rootMargin: "300px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchParticipantPage, participants.length, q, totalPeserta, totalHasilCari]);

  // Muat absensi untuk tanggal terpilih
  useEffect(() => {
    dateRef.current = date;
    if (!bookValid || !date) return;
    let cancelled = false;
    const cached = attendanceCache.current.get(date);
    if (cached) {
      setAtt(cached);
      setAttLoading(false);
    }

    const timer = setTimeout(async () => {
      if (cached) return;
      const requestId = ++attendanceRequestRef.current;
      setAttLoading(true);
      const rows: AttendanceRow[] = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("attendance")
          .select("participant_id, status, catatan")
          .eq("book_id", bookId)
          .eq("tanggal", date)
          .range(from, from + pageSize - 1);
        if (error || cancelled || requestId !== attendanceRequestRef.current) {
          if (!cancelled && requestId === attendanceRequestRef.current) {
            setError(friendlyError(error ?? { message: "Permintaan absensi dibatalkan." }));
            setAtt({});
            setAttLoading(false);
          }
          return;
        }
        const page = (data ?? []) as AttendanceRow[];
        rows.push(...page);
        if (page.length < pageSize) break;
      }

      const map: Record<string, AttRecord> = {};
      for (const r of rows) map[r.participant_id] = { status: r.status, catatan: r.catatan };
      if (cancelled || requestId !== attendanceRequestRef.current) return;
      attendanceCache.current.set(date, map);
      if (attendanceCache.current.size > ATTENDANCE_CACHE_LIMIT) {
        const oldest = attendanceCache.current.keys().next().value as string | undefined;
        if (oldest) attendanceCache.current.delete(oldest);
      }
      setAtt(map);
      setAttLoading(false);
    }, cached ? 0 : ATTENDANCE_DEBOUNCE_MS);

    return () => {
      flushAllNotes();
      cancelled = true;
      clearTimeout(timer);
    };
  }, [supabase, bookId, bookValid, date, attendanceReloadNonce]);

  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === "hidden") flushAllNotes();
    };
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushAllNotes);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushAllNotes);
    };
  });

  useEffect(() => {
    return () => {
      for (const id of Object.keys(savedTimers.current)) {
        clearTimeout(savedTimers.current[id]);
      }
    };
  }, []);

  // Toast hilang otomatis (hanya setelah buku berhasil dimuat)
  useEffect(() => {
    if (!book || (!error && !notice)) return;
    const t = setTimeout(() => {
      setError(null);
      setNotice(null);
    }, TOAST_MS);
    return () => clearTimeout(t);
  }, [book, error, notice]);

  // Escape menutup dialog (konfirmasi dan edit kolom ditutup lebih dulu)
  useEffect(() => {
    if (!formMode && !fieldsOpen && !confirm && !dateOpen && !actionTarget && !menuOpen && !shareOpen && !recapShareOpen && !detailTarget && !reorderOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirm) {
        if (!confirmBusy) setConfirm(null);
        return;
      }
      if (editFieldId) {
        setEditFieldId(null);
        return;
      }
      setMenuOpen(false);
      setShareOpen(false);
      setRecapShareOpen(false);
      setImportOpen(false);
      setExportOpen(false);
      setRecapParticipant(null);
      setReorderOpen(false);
      setDetailId(null);
      setFormMode(null);
      setFieldsOpen(false);
      setDateOpen(false);
      actionIdRef.current = null;
      setActionTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [formMode, fieldsOpen, confirm, confirmBusy, dateOpen, actionTarget, editFieldId, menuOpen, shareOpen, recapShareOpen, detailTarget, reorderOpen]);

  const visibleParticipants = participants;

  const summary = useMemo(() => {
    const counts = emptyCounts();
    let filled = 0;
    for (const r of Object.values(att)) {
      if (r) {
        counts[r.status] += 1;
        filled += 1;
      }
    }
    return { counts, unfilled: Math.max(0, totalPeserta - filled) };
  }, [totalPeserta, att]);

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

  // Jumlah catatan per tanggal lewat fungsi SQL attendance_date_counts (ringan).
  // Mengembalikan null bila fungsinya belum dibuat / gagal, lalu dipakai cara cadangan.
  async function countDatesViaRpc(): Promise<Record<string, number> | null> {
    const counts: Record<string, number> = {};
    const size = 1000; // batas baris per permintaan PostgREST
    for (let from = 0; ; from += size) {
      const { data, error } = await supabase
        .rpc("attendance_date_counts", { p_book_id: bookId })
        .range(from, from + size - 1);

      if (error) return null;
      const rows = (data ?? []) as { tanggal: string; jumlah: number }[];
      for (const r of rows) counts[r.tanggal] = Number(r.jumlah);
      if (rows.length < size) break;
    }
    return counts;
  }

  // Cara cadangan: unduh kolom tanggal semua baris lalu hitung di browser
  async function countDatesViaRows(): Promise<Record<string, number>> {
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
        setError(friendlyError(error));
        break;
      }
      for (const r of (data ?? []) as { tanggal: string }[]) {
        counts[r.tanggal] = (counts[r.tanggal] ?? 0) + 1;
      }
      if (!data || data.length < size) break;
    }
    return counts;
  }

  async function loadDateCounts() {
    const viaRpc = await countDatesViaRpc();
    setDateCounts(viaRpc ?? (await countDatesViaRows()));
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
    clearTimeout(noteTimers.current[p.id]);
    delete pendingNotes.current[p.id];
    const cachedDay = attendanceCache.current.get(day);

    setError(null);
    setAtt((m) => {
      const next = { ...m };
      if (clearing) delete next[p.id];
      else next[p.id] = { status, catatan: status === "izin" ? prev?.catatan ?? null : null };
      return next;
    });
    if (cachedDay) {
      const next = { ...cachedDay };
      if (clearing) delete next[p.id];
      else next[p.id] = { status, catatan: status === "izin" ? prev?.catatan ?? null : null };
      attendanceCache.current.set(day, next);
    }

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
      beginSave(p.id);
      const { error } = await supabase
        .from("attendance")
        .delete()
        .eq("book_id", bookId)
        .eq("participant_id", p.id)
        .eq("tanggal", day);
      if (error) {
        restore();
        if (cachedDay) attendanceCache.current.set(day, cachedDay);
        setError(friendlyError(error));
      }
      endSave(p.id, !error);
      return;
    }

    // `tanggal` selalu dikirim eksplisit (default database CURRENT_DATE memakai zona waktu server).
    // `catatan` hanya boleh terisi saat status izin (CHECK attendance_catatan_hanya_izin).
    beginSave(p.id);
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
      if (cachedDay) attendanceCache.current.set(day, cachedDay);
      setError(friendlyError(error));
    }
    endSave(p.id, !error);
  }

  function changeNote(p: Participant, text: string) {
    setAtt((m) => {
      const cur = m[p.id];
      if (!cur) return m;
      return { ...m, [p.id]: { ...cur, catatan: text } };
    });
    const day = date;
    pendingNotes.current[p.id] = { day, value: text };
    setSaveUi((m) => ({ ...m, [p.id]: "saving" }));
    clearTimeout(savedTimers.current[p.id]);
    clearTimeout(noteTimers.current[p.id]);
    noteTimers.current[p.id] = setTimeout(() => flushNote(p.id), NOTE_DEBOUNCE_MS);
  }

  // ---------- Modal aksi peserta ----------
  async function openActions(p: Participant) {
    actionIdRef.current = p.id;
    setActionTarget(p);
    setStats(null);

    // Hitung per status lewat count, tanpa mengunduh barisnya
    const results = await Promise.all(
      STATUSES.map((s) =>
        supabase
          .from("attendance")
          .select("id", { count: "exact", head: true })
          .eq("book_id", bookId)
          .eq("participant_id", p.id)
          .eq("status", s)
      )
    );

    if (actionIdRef.current !== p.id) return; // modal sudah ditutup / berganti peserta

    const counts = emptyCounts();
    STATUSES.forEach((s, i) => {
      counts[s] = results[i].count ?? 0;
    });
    const failed = results.find((r) => r.error);
    if (failed?.error) setError(friendlyError(failed.error));
    setStats(counts);
  }

  function closeActions() {
    actionIdRef.current = null;
    setActionTarget(null);
  }

  // ---------- Tambah / edit peserta ----------
  function openAdd() {
    setEditingId(null);
    setPName("");
    setPEmail("");
    setPData({});
    setFormMode("add");
  }

  function openEdit(p: Participant) {
    setEditingId(p.id);
    setPName(p.name);
    setPEmail(p.email ?? "");
    setPData({ ...p.data });
    setFormMode("edit");
  }

  function closeForm() {
    if (formBusy) return;
    setFormMode(null);
    setEditingId(null);
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    const nameValue = pName.trim();
    if (!nameValue || formBusy || !formMode) return;

    // Indeks unik database memakai lower(email), jadi email disimpan huruf kecil agar konsisten
    const emailValue = pEmail.trim().toLowerCase() || null;

    const data: Record<string, string> = {};
    for (const f of fields) {
      const v = (pData[f.key] ?? "").trim();
      if (v) data[f.key] = v;
    }

    const errorMessage = (err: DbError) =>
      err.code === "23505" ? DUPLICATE_EMAIL_MSG : friendlyError(err);
    setFormBusy(true);
    setError(null);
    setNotice(null);

    if (formMode === "edit" && editingId) {
      const { data: row, error } = await supabase
        .from("participants")
        .update({ name: nameValue, email: emailValue, data })
        .eq("id", editingId)
        .eq("book_id", bookId)
        .select("id, name, email, data, sort_order")
        .single();

      if (error) {
        setError(errorMessage(error));
      } else if (row) {
        const updated = toParticipant(row as ParticipantRow);
        setParticipants((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        setFormMode(null);
        setEditingId(null);
        setNotice("Perubahan peserta disimpan.");
      }
    } else {
      const { data: row, error } = await supabase
        .from("participants")
        .insert({
          book_id: bookId,
          name: nameValue,
          email: emailValue,
          data,
        })
        .select("id, name, email, data, sort_order")
        .single();

      if (error) {
        setError(errorMessage(error));
      } else if (row) {
        await reloadParticipants();
        await refreshParticipantTotal();
        setFormMode(null);
        setNotice("Peserta ditambahkan.");
      }
    }

    setFormBusy(false);
  }

  async function saveParticipantField(
    p: Participant,
    patch: { name?: string; email?: string | null; dataKey?: string; dataValue?: string }
  ): Promise<boolean> {
    if (detailBusy) return false;

    const update: { name?: string; email?: string | null; data?: Record<string, string> } = {};

    if (patch.name !== undefined) {
      const n = patch.name.trim();
      if (!n) return false;
      update.name = n;
    }
    if (patch.email !== undefined) {
      // Indeks unik database memakai lower(email), jadi simpan huruf kecil
      update.email = (patch.email ?? "").trim().toLowerCase() || null;
    }
    if (patch.dataKey !== undefined) {
      const data = { ...p.data };
      const v = (patch.dataValue ?? "").trim();
      if (v) data[patch.dataKey] = v;
      else delete data[patch.dataKey];
      update.data = data;
    }

    setDetailBusy(true);
    setError(null);
    setNotice(null);

    const { data: row, error } = await supabase
      .from("participants")
      .update(update)
      .eq("id", p.id)
      .eq("book_id", bookId)
      .select("id, name, email, data, sort_order")
      .single();

    setDetailBusy(false);

    if (error) {
      setError(error.code === "23505" ? DUPLICATE_EMAIL_MSG : friendlyError(error));
      return false;
    }
    const updated = toParticipant(row as ParticipantRow);
    setParticipants((list) => list.map((x) => (x.id === updated.id ? updated : x)));
    setNotice("Data peserta disimpan.");
    return true;
  }

  // ---------- Hapus (peserta / kolom) lewat modal konfirmasi ----------
  async function deleteParticipant(target: Participant) {
    clearTimeout(noteTimers.current[target.id]);
    delete pendingNotes.current[target.id];
    const { data, error } = await supabase
      .from("participants")
      .delete()
      .eq("id", target.id)
      .select("id");

    if (error) {
      setError(friendlyError(error));
      return;
    }
    if (!data || data.length === 0) {
      setError("Peserta tidak ditemukan atau Anda tidak punya akses untuk menghapusnya.");
      return;
    }

    // Riwayat absensi ikut terhapus oleh FK ON DELETE CASCADE
    attendanceCache.current.clear();
    setAttendanceReloadNonce((n) => n + 1);
    setAtt((m) => {
      const next = { ...m };
      delete next[target.id];
      return next;
    });
    await refreshParticipantList(q);
    await refreshParticipantTotal();
    setNotice("Peserta dihapus.");
  }

  async function deleteField(f: Field) {
    const { data, error } = await supabase
      .from("participant_fields")
      .delete()
      .eq("id", f.id)
      .select("id");

    if (error) {
      setError(friendlyError(error));
      return;
    }
    if (!data || data.length === 0) {
      setError("Kolom tidak ditemukan atau Anda tidak punya akses untuk menghapusnya.");
      return;
    }

    setFields((list) => list.filter((x) => x.id !== f.id));
    if (editFieldId === f.id) setEditFieldId(null);
    // Trigger participant_fields_cleanup sudah membersihkan data peserta; samakan tampilan lokal
    setParticipants((list) =>
      list.map((p) => {
        if (!(f.key in p.data)) return p;
        const next = { ...p.data };
        delete next[f.key];
        return { ...p, data: next };
      })
    );
    setNotice("Kolom dihapus.");
  }

  async function runConfirm() {
    if (!confirm || confirmBusy) return;
    const current = confirm;

    setConfirmBusy(true);
    setError(null);
    setNotice(null);

    if (current.kind === "participant") await deleteParticipant(current.participant);
    else await deleteField(current.field);

    setConfirmBusy(false);
    setConfirm(null);
  }

  // ---------- Kelola kolom kustom ----------
  // ---------- Bagikan buku absen ----------
  async function updateShare(patch: { share_enabled?: boolean; share_token?: string }, okMsg: string) {
    if (shareBusy) return;
    setShareBusy(true);
    setError(null);
    setNotice(null);

    const { data, error } = await supabase
      .from("books")
      .update(patch)
      .eq("id", bookId)
      .select("share_enabled, share_token")
      .single();

    if (error) {
      setError(friendlyError(error));
    } else if (data) {
      setBook((b) =>
        b ? { ...b, shareEnabled: data.share_enabled, shareToken: data.share_token } : b
      );
      setNotice(okMsg);
    }
    setShareBusy(false);
  }

  const toggleShare = (next: boolean) =>
    updateShare(
      { share_enabled: next },
      next ? "Tautan pendaftaran diaktifkan." : "Tautan pendaftaran dinonaktifkan."
    );

  const regenerateShare = () =>
    updateShare({ share_token: crypto.randomUUID().replace(/-/g, "") }, "Tautan baru dibuat.");

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
      setError(DUPLICATE_FIELD_MSG);
      return;
    }

    setFieldBusy(true);
    setError(null);
    setNotice(null);

    const nextOrder = fields.length ? Math.max(...fields.map((f) => f.sortOrder)) + 1 : 0;
    const { data, error } = await supabase
      .from("participant_fields")
      .insert({ book_id: bookId, key, label, sort_order: nextOrder })
      .select("id, key, label, sort_order")
      .single();

    if (error) {
      setError(error.code === "23505" ? DUPLICATE_FIELD_MSG : friendlyError(error));
    } else if (data) {
      setFields((list) => [...list, toField(data as FieldRow)]);
      setFLabel("");
      setNotice("Kolom ditambahkan.");
    }

    setFieldBusy(false);
  }

  function startEditField(f: Field) {
    setEditFieldId(f.id);
    setEditFieldLabel(f.label);
  }

  function cancelEditField() {
    setEditFieldId(null);
    setEditFieldLabel("");
  }

  // Hanya `label` yang diubah; `key` dikunci trigger participant_fields_lock_key,
  // sehingga isi data peserta tidak terpengaruh.
  async function saveFieldLabel() {
    const label = editFieldLabel.trim();
    const target = fields.find((f) => f.id === editFieldId);
    if (!target || !label || fieldBusy) return;

    if (label === target.label) {
      cancelEditField();
      return;
    }
    if (fields.some((f) => f.id !== target.id && f.label.toLowerCase() === label.toLowerCase())) {
      setError(DUPLICATE_FIELD_MSG);
      return;
    }

    setFieldBusy(true);
    setError(null);
    setNotice(null);

    const { data, error } = await supabase
      .from("participant_fields")
      .update({ label })
      .eq("id", target.id)
      .eq("book_id", bookId)
      .select("id, key, label, sort_order")
      .single();

    if (error) {
      setError(friendlyError(error));
    } else if (data) {
      const updated = toField(data as FieldRow);
      setFields((list) => list.map((f) => (f.id === updated.id ? updated : f)));
      cancelEditField();
      setNotice("Nama kolom diperbarui.");
    }

    setFieldBusy(false);
  }

  // Simpan urutan kolom hasil drag and drop ke kolom sort_order
  async function reorderFields(next: Field[]) {
    if (orderBusy) return;

    const prev = fields;
    const ordered = next.map((f, i) => ({ ...f, sortOrder: i }));
    const changed = ordered.filter(
      (f) => prev.find((p) => p.id === f.id)?.sortOrder !== f.sortOrder
    );

    setFields(ordered); // tampilkan dulu
    if (changed.length === 0) return;

    setOrderBusy(true);
    setError(null);
    setNotice(null);

    const results = await Promise.all(
      changed.map((f) =>
        supabase
          .from("participant_fields")
          .update({ sort_order: f.sortOrder })
          .eq("id", f.id)
          .eq("book_id", bookId)
          .select("id")
      )
    );
    const failed = results.find((r) => r.error || !r.data || r.data.length === 0);

    if (failed) {
      // Samakan kembali dengan isi database
      const { data } = await supabase
        .from("participant_fields")
        .select("id, key, label, sort_order")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (data) setFields((data as FieldRow[]).map(toField));
      else setFields(prev);
      setError(failed.error ? friendlyError(failed.error) : "Urutan kolom gagal disimpan.");
    }

    setOrderBusy(false);
  }

  // Simpan urutan peserta (daftar lengkap) lewat fungsi SQL satu transaksi
  async function reorderParticipants(next: Participant[]) {
    if (reorderBusy) return;

    const prev = participants;
    const ordered = next.map((p, i) => ({ ...p, sortOrder: i + 1 }));
    const same = ordered.length === prev.length && ordered.every((p, i) => p.id === prev[i].id);
    if (same) return;

    setParticipants(ordered);
    setReorderBusy(true);
    setError(null);
    setNotice(null);

    const { error } = await supabase.rpc("reorder_participants", {
      p_book_id: bookId,
      p_ids: ordered.map((p) => p.id),
    });

    if (error) {
      if (!(await reloadParticipants())) setParticipants(prev);
      setError(friendlyError(error));
    } else {
      await reloadParticipants();
    }
    setReorderBusy(false);
  }

  async function openReorder() {
    setReorderBusy(true);
    const rows: Participant[] = [];
    for (let from = 0; ; from += PARTICIPANT_REORDER_PAGE_SIZE) {
      const { data, error } = await supabase
        .from("participants")
        .select("id, name, sort_order")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, from + PARTICIPANT_REORDER_PAGE_SIZE - 1);
      if (error) {
        setError(friendlyError(error));
        setReorderBusy(false);
        return;
      }
      const page = ((data ?? []) as ParticipantRow[]).map(toParticipant);
      rows.push(...page);
      if (page.length < PARTICIPANT_REORDER_PAGE_SIZE) break;
    }
    setReorderParticipantList(rows);
    setReorderBusy(false);
    setReorderOpen(true);
  }

  function closeFields() {
    setFieldsOpen(false);
    cancelEditField();
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
            href={folderHref(book.folderId)}
            aria-label="Kembali"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft />
          </Link>

          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold sm:text-xl">{book.name}</h1>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-label="Tambah dan atur peserta"
            className="flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah</span>
          </button>
        </div>

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

          {importOpen && (
            <ParticipantImportModal supabase={supabase} bookId={book.id} bookName={book.name} onImported={() => void refreshParticipantList()} onNotice={(message, isError) => isError ? setError(message) : setNotice(message)} onClose={() => setImportOpen(false)} />
          )}
          {exportOpen && (
            <ParticipantExportModal supabase={supabase} bookId={book.id} bookName={book.name} onNotice={(message, isError) => isError ? setError(message) : setNotice(message)} onClose={() => setExportOpen(false)} />
          )}

          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-sm text-slate-600">
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
              return (
                <li key={p.id} className="relative rounded-3xl border border-slate-200 bg-white p-4">
                  <span
                    aria-live="polite"
                    className="pointer-events-none absolute right-11 top-4 bg-white pl-2 text-xs"
                  >
                    {saveUi[p.id] === "saving" && <span className="text-slate-400">Menyimpan...</span>}
                    {saveUi[p.id] === "saved" && <span className="text-emerald-600">Tersimpan</span>}
                  </span>
                  {/* Ketuk bagian ini untuk membuka modal aksi */}
                  <button
                    type="button"
                    onClick={() => openActions(p)}
                    aria-haspopup="dialog"
                    aria-label={`Buka menu ${p.name}`}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <span className="flex h-7 min-w-[28px] shrink-0 items-center justify-center rounded-lg bg-blue-600 px-1.5 text-xs font-semibold tabular-nums text-white">
                      {String(p.sortOrder).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="truncate text-xs text-slate-400">Ketuk untuk lihat data, edit, atau hapus</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                  </button>

                  <div className="mt-3 grid grid-cols-3 gap-2">
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
                      onBlur={() => {
                        flushNote(p.id);
                        setAtt((m) => m[p.id] ? { ...m, [p.id]: { ...m[p.id], catatan: (m[p.id].catatan ?? "").trim() } } : m);
                      }}
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
        <div ref={participantSentinelRef} className="h-1" />
        {(participantsLoading || searchLoading) && (
          <p className="py-3 text-center text-xs text-slate-400">Memuat peserta...</p>
        )}
      </main>

      {/* Modal pilih tanggal */}
      {dateOpen && (
        <DatePickerModal
          date={date}
          today={today}
          selectedMonth={selectedMonth}
          pickerMonth={pickerMonth}
          monthList={monthList}
          monthDays={monthDays}
          dayList={dayList}
          dateCounts={dateCounts}
          maxDate={ALLOW_FUTURE ? undefined : today}
          listRef={pickerListRef}
          onSelectMonth={setPickerMonth}
          onBackToMonths={() => setPickerMonth(null)}
          onPickDate={pickDate}
          onPickToday={() => pickDate(todayStr())}
          onClose={() => setDateOpen(false)}
        />
      )}

      {/* Modal aksi peserta: total status, edit, hapus */}
      {actionTarget && (
        <ParticipantActionModal
          key={actionTarget.id}
          participant={actionTarget}
          counts={stats}
          onEdit={() => {
            const p = actionTarget;
            closeActions();
            openEdit(p);
          }}
          onDelete={() => {
            const p = actionTarget;
            closeActions();
            setConfirm({ kind: "participant", participant: p });
          }}
          onViewDetail={() => {
            const p = actionTarget;
            closeActions();
            setDetailId(p.id);
          }}
          onViewRecap={() => {
            const p = actionTarget;
            closeActions();
            setRecapParticipant(p);
          }}
          onShare={() => {
            const p = actionTarget;
            closeActions();
            setRecapParticipant(p);
            setRecapShareOpen(true);
          }}
          onClose={closeActions}
        />
      )}

      {/* Modal menu tambah */}
      {menuOpen && (
        <AddMenuModal
          features={extraFeatures}
          onAddManual={() => {
            setMenuOpen(false);
            openAdd();
          }}
          onDefineFields={() => {
            setMenuOpen(false);
            setFieldsOpen(true);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Modal tambah / edit peserta */}
      {formMode && (
        <ParticipantFormModal
          title={formMode === "edit" ? "Edit peserta" : "Peserta baru"}
          submitLabel={formMode === "edit" ? "Simpan perubahan" : "Simpan"}
          name={pName}
          email={pEmail}
          fields={fields}
          data={pData}
          busy={formBusy}
          onNameChange={setPName}
          onEmailChange={setPEmail}
          onDataChange={(key, value) => setPData((d) => ({ ...d, [key]: value }))}
          onSubmit={submitForm}
          onClose={closeForm}
        />
      )}

      {/* Modal kelola kolom */}
      {fieldsOpen && (
        <FieldsModal
          fields={fields}
          label={fLabel}
          busy={fieldBusy || confirmBusy || orderBusy}
          dragDisabled={fieldBusy || confirmBusy || orderBusy || editFieldId !== null}
          editingId={editFieldId}
          editLabel={editFieldLabel}
          onLabelChange={setFLabel}
          onAdd={addField}
          onRemove={(f) => setConfirm({ kind: "field", field: f })}
          onStartEdit={startEditField}
          onEditLabelChange={setEditFieldLabel}
          onSaveEdit={saveFieldLabel}
          onCancelEdit={cancelEditField}
          onReorder={reorderFields}
          onClose={closeFields}
        />
      )}

      {/* Modal data lengkap peserta (bisa edit per baris) */}
      {detailTarget && (
        <ParticipantDetailModal
          key={detailTarget.id}
          participant={detailTarget}
          fields={fields}
          busy={detailBusy}
          onSave={(patch) => saveParticipantField(detailTarget, patch)}
          onClose={() => setDetailId(null)}
        />
      )}

      {recapParticipant && !recapShareOpen && (
        <ParticipantRecapSheet
          supabase={supabase}
          bookId={bookId}
          participant={recapParticipant}
          onShare={() => setRecapShareOpen(true)}
          onClose={() => setRecapParticipant(null)}
        />
      )}

      {/* Modal atur urutan peserta */}
      {reorderOpen && (
        <ReorderParticipantsModal
          participants={reorderParticipantList}
          busy={reorderBusy}
          onReorder={reorderParticipants}
          onClose={() => setReorderOpen(false)}
        />
      )}

      {/* Modal konfirmasi hapus (di atas modal lain) */}
      {confirm && (
        <ConfirmModal
          title={confirm.kind === "participant" ? "Hapus peserta?" : "Hapus kolom?"}
          message={
            confirm.kind === "participant" ? (
              <>
                <span className="font-medium text-slate-700">
                  &quot;{confirm.participant.name}&quot;
                </span>{" "}
                beserta seluruh riwayat absensinya akan dihapus permanen. Tindakan ini tidak dapat
                diurungkan.
              </>
            ) : (
              <>
                Kolom{" "}
                <span className="font-medium text-slate-700">
                  &quot;{confirm.field.label}&quot;
                </span>{" "}
                akan dihapus, dan isi kolom ini pada semua peserta ikut terhapus.
              </>
            )
          }
          busy={confirmBusy}
          onConfirm={runConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      {/* Modal bagikan buku absen */}
      {shareOpen && (
        <ShareModal
          enabled={book.shareEnabled}
          url={`${window.location.origin}/daftar/${book.shareToken}`}
          busy={shareBusy}
          onToggle={toggleShare}
          onRegenerate={regenerateShare}
          onClose={() => setShareOpen(false)}
        />
      )}

      {recapShareOpen && (
        <ShareRecapSheet
          bookId={book.id}
          participantId={recapParticipant?.id}
          participantName={recapParticipant?.name}
          defaultEmail={recapParticipant?.email}
          onRequestEditEmail={() => {
            if (!recapParticipant) return;
            const participant = recapParticipant;
            setRecapShareOpen(false);
            openEdit(participant);
          }}
          onClose={() => {
            setRecapShareOpen(false);
            setRecapParticipant(null);
          }}
          onNotice={(message, isError) => isError ? setError(message) : setNotice(message)}
        />
      )}

      {/* Notifikasi */}
      {(error || notice) && (
        <Toast
          type={error ? "error" : "success"}
          message={error ?? notice ?? ""}
          onClose={() => {
            setError(null);
            setNotice(null);
          }}
        />
      )}
    </div>
  );
}

export default function BukuAbsensiPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50" aria-label="Memuat buku" />
      }
    >
      <BukuAbsensiContent />
    </Suspense>
  );
}
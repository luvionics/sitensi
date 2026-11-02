"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Folder = { id: string; name: string; parentId: string | null };
type Book = { id: string; name: string; folderId: string | null; createdAt: string };
type Gate = "loading" | "ok" | "blocked" | "notfound";
type Preview = { members: number; fields: number };

type FolderRow = { id: string; name: string; parent_id: string | null };
type BookRow = { id: string; name: string; folder_id: string | null; created_at: string };

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const chunk = <T,>(list: T[], size = 500) => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
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

const FolderIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </Svg>
);
const BookIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="m9 11 2 2 4-4" />
  </Svg>
);
const ChevronLeft = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="m15 18-6-6 6-6" /></Svg>
);
const ChevronRight = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="m9 18 6-6-6-6" /></Svg>
);
const SearchIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);

/* ---------- Dialog dasar ---------- */
function Modal({
  children,
  onClose,
  busy,
}: {
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
      onClick={() => {
        if (!busy) onClose();
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl"
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- Dialog konfirmasi salin ---------- */
function CopyDialog({
  source,
  targetName,
  preview,
  busy,
  error,
  includeData,
  onToggleData,
  onConfirm,
  onClose,
}: {
  source: Book;
  targetName: string;
  preview: Preview | null;
  busy: boolean;
  error: string | null;
  includeData: boolean;
  onToggleData: (v: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const sourceEmpty = !!preview && preview.members === 0 && preview.fields === 0;

  return (
    <Modal onClose={onClose} busy={busy}>
      <h2 id="modal-title" className="text-lg font-semibold">
        Salin dari &quot;{source.name}&quot;?
      </h2>

      {!preview ? (
        <div className="mt-4 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      ) : sourceEmpty ? (
        <p className="mt-2 text-sm text-slate-500">
          Buku ini tidak punya peserta maupun kolom data, jadi tidak ada yang bisa disalin. Pilih buku lain.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-500">
            <span className="font-medium text-slate-700">
              {preview.members} peserta dan {preview.fields} kolom data
            </span>{" "}
            akan disalin ke <span className="font-medium text-slate-700">&quot;{targetName}&quot;</span>. Catatan
            kehadiran tidak ikut disalin.
          </p>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={includeData}
              onChange={(e) => onToggleData(e.target.checked)}
              disabled={busy}
              className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
            />
            <span>
              <span className="block text-sm font-medium text-slate-800">Sertakan isi kolom data</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Nilai seperti NIM atau kelas pada tiap peserta ikut disalin.
              </span>
            </span>
          </label>
        </>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy || !preview || sourceEmpty}
          className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {busy ? "Menyalin..." : "Salin"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Halaman ---------- */
export default function SalinPesertaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookId = params.id;
  const backHref = `/buku/${bookId}/peserta`;

  const [gate, setGate] = useState<Gate>("loading");
  const [bookName, setBookName] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [picked, setPicked] = useState<Book | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [includeData, setIncludeData] = useState(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const crumbRef = useRef<HTMLDivElement | null>(null);

  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const currentFolder = currentFolderId ? folderMap.get(currentFolderId) ?? null : null;
  const q = query.trim().toLowerCase();

  /* ---------- Muat data + cek buku kosong ---------- */
  const load = useCallback(async () => {
    const [bookRes, memberCount, fieldCount, foldersRes, booksRes] = await Promise.all([
      supabase.from("books").select("name").eq("id", bookId).maybeSingle(),
      supabase.from("book_participants").select("participant_id", { count: "exact", head: true }).eq("book_id", bookId),
      supabase.from("participant_fields").select("id", { count: "exact", head: true }).eq("book_id", bookId),
      supabase.from("folders").select("id, name, parent_id").order("created_at", { ascending: true }),
      supabase.from("books").select("id, name, folder_id, created_at").order("created_at", { ascending: true }),
    ]);

    const err = bookRes.error || memberCount.error || fieldCount.error || foldersRes.error || booksRes.error;
    if (err) {
      setError(err.message || "Gagal memuat data.");
      setGate("blocked");
      return;
    }
    if (!bookRes.data) {
      setGate("notfound");
      return;
    }

    setBookName(bookRes.data.name);
    setFolders(((foldersRes.data ?? []) as FolderRow[]).map((r) => ({ id: r.id, name: r.name, parentId: r.parent_id })));
    setBooks(
      ((booksRes.data ?? []) as BookRow[])
        .filter((r) => r.id !== bookId)
        .map((r) => ({ id: r.id, name: r.name, folderId: r.folder_id, createdAt: formatDate(r.created_at) }))
    );

    const notEmpty = (memberCount.count ?? 0) > 0 || (fieldCount.count ?? 0) > 0;
    setGate(notEmpty ? "blocked" : "ok");
  }, [supabase, bookId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Gulirkan breadcrumb ke ujung saat lokasi berubah
  useEffect(() => {
    const el = crumbRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [currentFolderId, folders]);

  const visibleFolders = useMemo(
    () => folders.filter((f) => f.parentId === currentFolderId && f.name.toLowerCase().includes(q)),
    [folders, currentFolderId, q]
  );
  const visibleBooks = useMemo(
    () => books.filter((b) => b.folderId === currentFolderId && b.name.toLowerCase().includes(q)),
    [books, currentFolderId, q]
  );

  function pathTo(id: string | null): Folder[] {
    const result: Folder[] = [];
    const seen = new Set<string>();
    let cur = id ? folderMap.get(id) : undefined;
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      result.unshift(cur);
      cur = cur.parentId ? folderMap.get(cur.parentId) : undefined;
    }
    return result;
  }

  function openFolder(id: string) {
    setCurrentFolderId(id);
    setQuery("");
  }
  function goRoot() {
    setCurrentFolderId(null);
    setQuery("");
  }
  function goBack() {
    if (!currentFolder) return;
    setCurrentFolderId(currentFolder.parentId ?? null);
    setQuery("");
  }

  /* ---------- Pilih buku sumber ---------- */
  async function pickBook(b: Book) {
    setPicked(b);
    setPreview(null);
    setModalError(null);

    const [m, f] = await Promise.all([
      supabase.from("book_participants").select("participant_id", { count: "exact", head: true }).eq("book_id", b.id),
      supabase.from("participant_fields").select("id", { count: "exact", head: true }).eq("book_id", b.id),
    ]);

    if (m.error || f.error) {
      setModalError(m.error?.message ?? f.error?.message ?? "Gagal memuat isi buku.");
      setPreview({ members: 0, fields: 0 });
      return;
    }
    setPreview({ members: m.count ?? 0, fields: f.count ?? 0 });
  }

  const closeModal = useCallback(() => setPicked(null), []);

  /* ---------- Salin ---------- */
  async function rollback() {
    await supabase.from("book_participants").delete().eq("book_id", bookId);
    await supabase.from("participant_fields").delete().eq("book_id", bookId);
  }

  async function doCopy() {
    if (!picked || busy) return;
    setBusy(true);
    setModalError(null);

    // Pastikan buku tujuan masih kosong
    const [m, f] = await Promise.all([
      supabase.from("book_participants").select("participant_id", { count: "exact", head: true }).eq("book_id", bookId),
      supabase.from("participant_fields").select("id", { count: "exact", head: true }).eq("book_id", bookId),
    ]);
    if (m.error || f.error) {
      setModalError(m.error?.message ?? f.error?.message ?? "Gagal memeriksa buku.");
      setBusy(false);
      return;
    }
    if ((m.count ?? 0) > 0 || (f.count ?? 0) > 0) {
      setPicked(null);
      setBusy(false);
      setGate("blocked");
      return;
    }

    // Ambil data sumber
    const [fieldsRes, membersRes, dataRes] = await Promise.all([
      supabase
        .from("participant_fields")
        .select("key, label, sort_order")
        .eq("book_id", picked.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("book_participants")
        .select("participant_id, sort_order")
        .eq("book_id", picked.id)
        .order("sort_order", { ascending: true }),
      includeData
        ? supabase.from("book_participant_data").select("participant_id, data").eq("book_id", picked.id)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const readErr = fieldsRes.error || membersRes.error || dataRes.error;
    if (readErr) {
      setModalError(readErr.message);
      setBusy(false);
      return;
    }

    const srcFields = (fieldsRes.data ?? []) as { key: string; label: string; sort_order: number }[];
    const srcMembers = (membersRes.data ?? []) as { participant_id: string; sort_order: number }[];
    const srcData = (dataRes.data ?? []) as { participant_id: string; data: Record<string, unknown> }[];

    // 1) Kolom dulu, agar validasi isi kolom bisa lolos
    if (srcFields.length > 0) {
      const { error: e } = await supabase.from("participant_fields").insert(
        srcFields.map((x) => ({ book_id: bookId, key: x.key, label: x.label, sort_order: x.sort_order }))
      );
      if (e) {
        await rollback();
        setModalError(`Gagal menyalin kolom: ${e.message}`);
        setBusy(false);
        return;
      }
    }

    // 2) Peserta
    for (const part of chunk(srcMembers)) {
      const { error: e } = await supabase.from("book_participants").insert(
        part.map((x) => ({ book_id: bookId, participant_id: x.participant_id, sort_order: x.sort_order }))
      );
      if (e) {
        await rollback();
        setModalError(`Gagal menyalin peserta: ${e.message}`);
        setBusy(false);
        return;
      }
    }

    // 3) Isi kolom tiap peserta (opsional)
    if (includeData && srcData.length > 0) {
      for (const part of chunk(srcData)) {
        const { error: e } = await supabase
          .from("book_participant_data")
          .upsert(
            part.map((x) => ({ book_id: bookId, participant_id: x.participant_id, data: x.data })),
            { onConflict: "book_id,participant_id" }
          );
        if (e) {
          await rollback();
          setModalError(`Gagal menyalin isi kolom: ${e.message}`);
          setBusy(false);
          return;
        }
      }
    }

    router.replace(backHref);
  }

  /* ---------- Render ---------- */
  if (gate === "loading") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl space-y-3 px-4 pt-6 sm:px-6">
          <div className="h-11 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-12 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-20 animate-pulse rounded-3xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (gate === "notfound") {
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

  if (gate === "blocked") {
    return (
      <div className="min-h-screen bg-slate-50 px-4 pt-16 text-center text-slate-900">
        <h1 className="text-base font-semibold">{error ? "Gagal memuat halaman" : "Buku ini belum kosong"}</h1>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
          {error ??
            "Salin peserta hanya bisa dilakukan pada buku tanpa peserta dan kolom data. Hapus semuanya lewat menu pengaturan, lalu coba lagi."}
        </p>
        <button
          type="button"
          onClick={() => router.replace(backHref)}
          className="mt-5 cursor-pointer rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Kembali ke manajemen peserta
        </button>
      </div>
    );
  }

  const path = pathTo(currentFolderId);
  const atRoot = !currentFolder;
  const isEmpty = visibleFolders.length === 0 && visibleBooks.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => router.push(backHref)}
            aria-label="Kembali ke manajemen peserta"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-lg font-bold">Salin peserta</h1>
            <p className="truncate text-[11px] text-slate-500">Ke {bookName}</p>
          </div>
          <div className="h-11 w-11 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-1 sm:px-6">
        <p className="mb-3 text-sm text-slate-500">Pilih buku yang pesertanya ingin disalin.</p>

        {/* Navigasi folder */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            disabled={atRoot}
            aria-label="Kembali ke folder sebelumnya"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border focus:outline-none ${
              atRoot
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                : "cursor-pointer border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500"
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <nav aria-label="Lokasi folder" className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white">
            <div
              ref={crumbRef}
              onWheel={(e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) e.currentTarget.scrollLeft += e.deltaY;
              }}
              className="flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap px-2 py-1.5 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {atRoot ? (
                <span className="shrink-0 px-2.5 py-1 font-medium text-slate-700">Semua buku</span>
              ) : (
                <button
                  type="button"
                  onClick={goRoot}
                  className="shrink-0 cursor-pointer rounded-full px-2.5 py-1 font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Semua buku
                </button>
              )}

              {path.map((f, i) => {
                const last = i === path.length - 1;
                return (
                  <span key={f.id} className="flex shrink-0 items-center gap-1">
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    {last ? (
                      <span className="shrink-0 px-2.5 py-1 font-medium text-slate-700">{f.name}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openFolder(f.id)}
                        className="shrink-0 cursor-pointer rounded-full px-2.5 py-1 font-medium text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        {f.name}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Pencarian */}
        <div className="relative mt-4">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={currentFolder ? "Cari buku atau folder di sini" : "Cari buku atau folder"}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Grid folder dan buku */}
        {!isEmpty && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                onClick={() => openFolder(folder.id)}
                className="flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <FolderIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{folder.name}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            ))}

            {visibleBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => pickBook(book)}
                className="flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                  <BookIcon />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{book.name}</p>
                  <p className="truncate text-sm text-slate-500">Dibuat {book.createdAt}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Kosong */}
        {isEmpty && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BookIcon className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              {q ? "Tidak ada hasil" : currentFolder ? "Folder ini kosong" : "Belum ada buku lain"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {q ? "Coba kata kunci lain." : "Tidak ada buku yang bisa dijadikan sumber salinan di sini."}
            </p>
          </div>
        )}
      </main>

      {picked && (
        <CopyDialog
          source={picked}
          targetName={bookName}
          preview={preview}
          busy={busy}
          error={modalError}
          includeData={includeData}
          onToggleData={setIncludeData}
          onConfirm={doCopy}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
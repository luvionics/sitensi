"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "./components/Header";

type Folder = { id: string; name: string; parentId: string | null };
type Book = { id: string; name: string; folderId: string | null; createdAt: string };
type ModalType = "folder" | "book" | null;
type DragItem = { type: "book" | "folder"; id: string };
type Toast = { message: string; undo?: () => void };

type FolderRow = { id: string; name: string; parent_id: string | null };
type BookRow = { id: string; name: string; folder_id: string | null; created_at: string };

const ROOT = "__root__";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const toBook = (r: BookRow): Book => ({
  id: r.id,
  name: r.name,
  folderId: r.folder_id,
  createdAt: formatDate(r.created_at),
});

const toFolder = (r: FolderRow): Folder => ({
  id: r.id,
  name: r.name,
  parentId: r.parent_id,
});

function FolderIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function BookIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  );
}

function ChevronLeft({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
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

function MoreIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function MoveIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      <path d="M9 13h6" />
      <path d="m13 10 3 3-3 3" />
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

export default function Home() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalType>(null);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");

  // Pindah item
  const [drag, setDrag] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [cardMenu, setCardMenu] = useState<DragItem | null>(null);
  const [moving, setMoving] = useState<DragItem | null>(null);
  const [pickerId, setPickerId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hapus item
  const [deleting, setDeleting] = useState<DragItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Breadcrumb yang bisa di-scroll
  const crumbRef = useRef<HTMLDivElement | null>(null);

  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const currentFolder = currentFolderId ? folderMap.get(currentFolderId) ?? null : null;
  const q = query.trim().toLowerCase();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [foldersRes, booksRes] = await Promise.all([
      supabase.from("folders").select("id, name, parent_id").order("created_at", { ascending: true }),
      supabase
        .from("books")
        .select("id, name, folder_id, created_at")
        .order("created_at", { ascending: true }),
    ]);

    if (foldersRes.error || booksRes.error) {
      setError(foldersRes.error?.message || booksRes.error?.message || "Gagal memuat data.");
    } else {
      setFolders((foldersRes.data ?? []).map(toFolder));
      setBooks((booksRes.data ?? []).map(toBook));
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  // Gulirkan breadcrumb ke ujung (folder terdalam) saat lokasi berubah
  useEffect(() => {
    const el = crumbRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [currentFolderId, folders]);

  const visibleFolders = useMemo(
    () =>
      folders.filter(
        (f) => f.parentId === currentFolderId && f.name.toLowerCase().includes(q)
      ),
    [folders, currentFolderId, q]
  );

  const visibleBooks = useMemo(
    () =>
      books.filter(
        (b) => b.folderId === currentFolderId && b.name.toLowerCase().includes(q)
      ),
    [books, currentFolderId, q]
  );

  // Rantai folder dari akar sampai folder dengan id tertentu
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

  // Apakah targetId sama dengan, atau berada di dalam, folder ancestorId
  function isInside(targetId: string | null, ancestorId: string) {
    const seen = new Set<string>();
    let cur = targetId;
    while (cur) {
      if (cur === ancestorId) return true;
      if (seen.has(cur)) return false;
      seen.add(cur);
      cur = folderMap.get(cur)?.parentId ?? null;
    }
    return false;
  }

  // Id folder ini beserta semua subfolder di bawahnya
  function folderTreeIds(rootId: string): Set<string> {
    const ids = new Set<string>([rootId]);
    let added = true;
    while (added) {
      added = false;
      for (const f of folders) {
        if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id);
          added = true;
        }
      }
    }
    return ids;
  }

  function canMove(item: DragItem, targetId: string | null) {
    if (item.type === "book") {
      const b = books.find((x) => x.id === item.id);
      return !!b && b.folderId !== targetId;
    }
    const f = folderMap.get(item.id);
    if (!f) return false;
    if (f.parentId === targetId) return false;
    return !isInside(targetId, f.id);
  }

  function itemName(item: DragItem) {
    return item.type === "book"
      ? books.find((b) => b.id === item.id)?.name ?? ""
      : folderMap.get(item.id)?.name ?? "";
  }

  function showToast(message: string, undo?: () => void) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  function hideToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }

  // Jalankan perpindahan (update lokal dulu, lalu simpan ke Supabase)
  async function performMove(
    item: DragItem,
    toId: string | null,
    fromId: string | null
  ): Promise<boolean> {
    const apply = (id: string | null) => {
      if (item.type === "book") {
        setBooks((list) => list.map((b) => (b.id === item.id ? { ...b, folderId: id } : b)));
      } else {
        setFolders((list) => list.map((f) => (f.id === item.id ? { ...f, parentId: id } : f)));
      }
    };

    apply(toId);

    const table = item.type === "book" ? "books" : "folders";
    const column = item.type === "book" ? "folder_id" : "parent_id";

    const { data, error } = await supabase
      .from(table)
      .update({ [column]: toId })
      .eq("id", item.id)
      .select("id");

    if (error || !data || data.length === 0) {
      apply(fromId);
      setError(
        error?.message ?? "Gagal memindahkan. Periksa izin update (RLS) pada tabel di Supabase."
      );
      return false;
    }
    return true;
  }

  async function moveItem(item: DragItem, toId: string | null) {
    if (!canMove(item, toId)) return;

    const fromId =
      item.type === "book"
        ? books.find((b) => b.id === item.id)?.folderId ?? null
        : folderMap.get(item.id)?.parentId ?? null;

    const label = toId ? folderMap.get(toId)?.name ?? "folder" : "Semua buku";
    const itemLabel = itemName(item);

    setError(null);
    const ok = await performMove(item, toId, fromId);
    if (ok) {
      showToast(`"${itemLabel}" dipindahkan ke ${label}`, () => {
        performMove(item, fromId, toId);
      });
    }
  }

  // Hapus buku atau folder (isi folder ikut terhapus lewat ON DELETE CASCADE)
  function openDelete(item: DragItem) {
    setCardMenu(null);
    setDeleting(item);
  }

  async function confirmDelete() {
    if (!deleting || deleteBusy) return;
    const item = deleting;
    const label = itemName(item);

    setDeleteBusy(true);
    setError(null);

    const table = item.type === "book" ? "books" : "folders";
    const { data, error } = await supabase.from(table).delete().eq("id", item.id).select("id");

    if (error || !data || data.length === 0) {
      setError(
        error?.message ?? "Gagal menghapus. Periksa izin hapus (RLS) pada tabel di Supabase."
      );
    } else {
      if (item.type === "book") {
        setBooks((list) => list.filter((b) => b.id !== item.id));
      } else {
        const ids = folderTreeIds(item.id);
        setFolders((list) => list.filter((f) => !ids.has(f.id)));
        setBooks((list) => list.filter((b) => !(b.folderId && ids.has(b.folderId))));
      }
      showToast(`"${label}" dihapus`);
    }

    setDeleteBusy(false);
    setDeleting(null);
  }

  // Ringkasan isi yang ikut terhapus bila item adalah folder
  const deleteInfo = useMemo(() => {
    if (!deleting || deleting.type !== "folder") return null;
    const ids = folderTreeIds(deleting.id);
    const subfolders = ids.size - 1;
    const bookCount = books.filter((b) => b.folderId && ids.has(b.folderId)).length;
    return { subfolders, bookCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deleting, folders, books]);

  // Seret dan lepas (desktop)
  function handleDragStart(e: React.DragEvent<HTMLElement>, item: DragItem) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.id);
    setCardMenu(null);
    // Ditunda agar render ulang tidak membatalkan drag di beberapa browser
    setTimeout(() => setDrag(item), 0);
  }

  function handleDragEnd() {
    setDrag(null);
    setDropTarget(null);
  }

  function dropProps(targetId: string | null) {
    const key = targetId ?? ROOT;
    return {
      onDragOver: (e: React.DragEvent<HTMLElement>) => {
        if (!drag || !canMove(drag, targetId)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dropTarget !== key) setDropTarget(key);
      },
      onDragLeave: (e: React.DragEvent<HTMLElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setDropTarget((t) => (t === key ? null : t));
        }
      },
      onDrop: (e: React.DragEvent<HTMLElement>) => {
        if (!drag || !canMove(drag, targetId)) return;
        e.preventDefault();
        const item = drag;
        setDrag(null);
        setDropTarget(null);
        // eslint-disable-next-line react-hooks/refs
        moveItem(item, targetId);
      },
    };
  }

  // Dialog "Pindahkan ke..." (mobile dan desktop)
  function openMove(item: DragItem) {
    setCardMenu(null);
    setMoving(item);
    setPickerId(currentFolderId);
  }

  function confirmMove() {
    if (!moving) return;
    const item = moving;
    setMoving(null);
    moveItem(item, pickerId);
  }

  function openFolder(id: string) {
    setCurrentFolderId(id);
    setQuery("");
  }

  // Buka halaman buku absensi
  function openBook(id: string) {
    router.push(`/buku/${id}`);
  }

  function goRoot() {
    setCurrentFolderId(null);
    setQuery("");
  }

  function goBack() {
    setCurrentFolderId(currentFolder?.parentId ?? null);
    setQuery("");
  }

  // Tutup menu kartu saat klik di luar
  useEffect(() => {
    if (!cardMenu) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!(e.target as Element).closest("[data-card-menu]")) setCardMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [cardMenu]);

  // Escape menutup dialog dan menu
  useEffect(() => {
    if (!modal && !moving && !cardMenu && !deleting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setName("");
        setMoving(null);
        setCardMenu(null);
        if (!deleteBusy) setDeleting(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, moving, cardMenu, deleting, deleteBusy]);

  function openModal(type: ModalType) {
    setName("");
    setModal(type);
  }

  function closeModal() {
    setModal(null);
    setName("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value || saving) return;

    setSaving(true);
    setError(null);

    if (modal === "folder") {
      const { data, error } = await supabase
        .from("folders")
        .insert({ name: value, parent_id: currentFolderId })
        .select("id, name, parent_id")
        .single();

      if (error) {
        setError(error.message);
      } else if (data) {
        setFolders((prev) => [...prev, toFolder(data)]);
        closeModal();
      }
    } else if (modal === "book") {
      const { data, error } = await supabase
        .from("books")
        .insert({ name: value, folder_id: currentFolderId })
        .select("id, name, folder_id, created_at")
        .single();

      if (error) {
        setError(error.message);
      } else if (data) {
        setBooks((prev) => [...prev, toBook(data)]);
        closeModal();
      }
    }

    setSaving(false);
  }

  const isEmpty = visibleFolders.length === 0 && visibleBooks.length === 0;
  const path = pathTo(currentFolderId);

  // Daftar folder di dialog pemindah
  const pickerFolder = pickerId ? folderMap.get(pickerId) ?? null : null;
  const pickerFolders = moving
    ? folders.filter(
        (f) => f.parentId === pickerId && !(moving.type === "folder" && f.id === moving.id)
      )
    : [];

  // Tombol titik tiga + menu di tiap kartu
  function renderCardMenu(item: DragItem) {
    const open = cardMenu?.type === item.type && cardMenu.id === item.id;
    return (
      <div
        data-card-menu
        className="relative shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setCardMenu(open ? null : item)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={`Opsi untuk ${itemName(item)}`}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <MoreIcon />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => openMove(item)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 focus:outline-none focus-visible:bg-slate-50"
            >
              <MoveIcon className="h-5 w-5 text-blue-600" />
              Pindahkan
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => openDelete(item)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:bg-red-50"
            >
              <TrashIcon className="h-5 w-5" />
              Hapus
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* inFolder=false: folder baru boleh dibuat di dalam folder (subfolder) */}
      <Header inFolder={false} onNew={openModal} />

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-2 sm:px-6 sm:pt-4">
        {/* Navigasi folder: tombol kembali + kotak jalur yang bisa di-scroll */}
        {currentFolder && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goBack}
              aria-label="Kembali ke folder sebelumnya"
              className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <nav
              aria-label="Lokasi folder"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white"
            >
              <div
                ref={crumbRef}
                onWheel={(e) => {
                  if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.currentTarget.scrollLeft += e.deltaY;
                  }
                }}
                className="flex flex-nowrap items-center gap-1 overflow-x-auto whitespace-nowrap px-2 py-1.5 text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                <button
                  type="button"
                  onClick={goRoot}
                  {...dropProps(null)}
                  className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    dropTarget === ROOT
                      ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                      : "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                >
                  Semua buku
                </button>

                {path.map((f, i) => {
                  const last = i === path.length - 1;
                  return (
                    <span key={f.id} className="flex shrink-0 items-center gap-1">
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      {last ? (
                        <span className="shrink-0 px-2.5 py-1 font-medium text-slate-700">
                          {f.name}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openFolder(f.id)}
                          {...dropProps(f.id)}
                          className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                            dropTarget === f.id
                              ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                              : "text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                          }`}
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
        )}

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

        {/* Pencarian */}
        <div className={`relative ${currentFolder ? "mt-4" : "mt-2"}`}>
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={currentFolder ? "Cari buku atau folder di sini" : "Cari buku atau folder"}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Memuat */}
        {loading && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-3xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {/* Satu grid untuk folder dan buku */}
        {!loading && !isEmpty && (
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleFolders.map((folder) => {
              const item: DragItem = { type: "folder", id: folder.id };
              const isTarget = dropTarget === folder.id;
              const isDragging = drag?.type === "folder" && drag.id === folder.id;
              return (
                <div
                  key={folder.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  {...dropProps(folder.id)}
                  onClick={() => openFolder(folder.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openFolder(folder.id);
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-4 rounded-3xl border p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isTarget
                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                      : "border-slate-200 bg-white hover:border-blue-300"
                  } ${isDragging ? "opacity-40" : ""}`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <FolderIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{folder.name}</p>
                  </div>
                  {renderCardMenu(item)}
                </div>
              );
            })}

            {visibleBooks.map((book) => {
              const item: DragItem = { type: "book", id: book.id };
              const isDragging = drag?.type === "book" && drag.id === book.id;
              return (
                <div
                  key={book.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                  onClick={() => openBook(book.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openBook(book.id);
                    }
                  }}
                  className={`flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isDragging ? "opacity-40" : ""
                  }`}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <BookIcon />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{book.name}</p>
                    <p className="truncate text-sm text-slate-500">Dibuat {book.createdAt}</p>
                  </div>
                  {renderCardMenu(item)}
                </div>
              );
            })}
          </div>
        )}

        {/* Tampilan kosong */}
        {!loading && isEmpty && (
          <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <BookIcon className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-base font-semibold">
              {q ? "Tidak ada hasil" : currentFolder ? "Folder ini kosong" : "Belum ada buku absensi"}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              {q
                ? "Coba kata kunci lain."
                : currentFolder
                ? "Buat buku atau folder baru lewat tombol Baru."
                : "Buat buku absensi pertama untuk mulai mencatat kehadiran."}
            </p>
          </div>
        )}
      </main>

      {/* Dialog buat baru */}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          onClick={closeModal}
          role="presentation"
        >
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
          >
            <h2 id="modal-title" className="text-lg font-semibold">
              {modal === "folder" ? "Folder baru" : "Buku absensi baru"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {modal === "folder"
                ? currentFolder
                  ? `Folder akan dibuat di dalam ${currentFolder.name}.`
                  : "Kelompokkan beberapa buku absensi dalam satu folder."
                : currentFolder
                ? `Buku akan disimpan di folder ${currentFolder.name}.`
                : "Beri nama buku, misalnya nama kelas atau mata pelajaran."}
            </p>

            <label htmlFor="name" className="mt-5 block text-sm font-medium text-slate-700">
              Nama
            </label>
            <input
              id="name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={modal === "folder" ? "Contoh: Kelas XII" : "Contoh: Matematika X-A"}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!name.trim() || saving}
                className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dialog pindahkan ke folder */}
      {moving && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          onClick={() => setMoving(null)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="move-title"
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-md flex-col rounded-3xl bg-white p-6 shadow-xl"
          >
            <h2 id="move-title" className="truncate text-lg font-semibold">
              {`Pindahkan "${itemName(moving)}"`}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Pilih folder tujuan.</p>

            <div className="mt-4 flex items-center gap-1">
              {pickerId !== null && (
                <button
                  type="button"
                  onClick={() => setPickerId(pickerFolder?.parentId ?? null)}
                  aria-label="Naik satu level"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <p className="truncate px-1 text-sm font-semibold text-slate-800">
                {pickerFolder?.name ?? "Semua buku"}
              </p>
            </div>

            <div className="mt-2 min-h-[8rem] flex-1 overflow-y-auto rounded-2xl border border-slate-200">
              {pickerFolders.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-slate-500">
                  Tidak ada folder di sini.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {pickerFolders.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => setPickerId(f.id)}
                        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50"
                      >
                        <FolderIcon className="h-5 w-5 shrink-0 text-blue-600" />
                        <span className="min-w-0 flex-1 truncate">{f.name}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {!canMove(moving, pickerId) && (
              <p className="mt-3 text-xs text-slate-500">
                Item sudah berada di lokasi ini. Pilih folder lain.
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setMoving(null)}
                className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmMove}
                disabled={!canMove(moving, pickerId)}
                className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                Pindahkan ke sini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog konfirmasi hapus */}
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
            aria-labelledby="delete-title"
            aria-describedby="delete-desc"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <TrashIcon className="h-6 w-6" />
            </div>
            <h2 id="delete-title" className="mt-4 text-lg font-semibold">
              {deleting.type === "folder" ? "Hapus folder?" : "Hapus buku?"}
            </h2>
            <p id="delete-desc" className="mt-1 text-sm text-slate-500">
              {deleting.type === "folder" ? (
                <>
                  Folder <span className="font-medium text-slate-700">&quot;{itemName(deleting)}&quot;</span>
                  {deleteInfo && (deleteInfo.subfolders > 0 || deleteInfo.bookCount > 0)
                    ? ` beserta isinya (${[
                        deleteInfo.subfolders > 0 ? `${deleteInfo.subfolders} subfolder` : null,
                        deleteInfo.bookCount > 0 ? `${deleteInfo.bookCount} buku` : null,
                      ]
                        .filter(Boolean)
                        .join(" dan ")}) akan dihapus permanen.`
                    : " akan dihapus permanen."}
                </>
              ) : (
                <>
                  Buku <span className="font-medium text-slate-700">&quot;{itemName(deleting)}&quot;</span> akan
                  dihapus permanen.
                </>
              )}{" "}
              Tindakan ini tidak dapat diurungkan.
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

      {/* Notifikasi dengan tombol Urungkan */}
      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-4 z-[60] mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
        >
          <span className="min-w-0 truncate">{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                const undo = toast.undo;
                hideToast();
                undo?.();
              }}
              className="shrink-0 cursor-pointer font-semibold text-blue-300 hover:text-blue-200 focus:outline-none focus-visible:underline"
            >
              Urungkan
            </button>
          )}
        </div>
      )}
    </div>
  );
}
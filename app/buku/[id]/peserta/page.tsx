"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Participant = { id: string; name: string; email: string | null };
type Member = Participant & { sort_order: number };
type Field = { id: string; key: string; label: string; sort_order: number };
type NewRow = { name: string; email: string | null; values: Record<string, string> };
type DataMap = Record<string, Record<string, string>>;

type BpRow = {
  participant_id: string;
  sort_order: number;
  participants: Participant | Participant[] | null;
};

type DataRow = { participant_id: string; data: Record<string, unknown> | null };

type ModalState =
  | { kind: "add" }
  | { kind: "editMember"; m: Member }
  | { kind: "settings" }
  | { kind: "clearAll" }
  | { kind: "removeMember"; m: Member }
  | { kind: "field"; f: Field | null }
  | { kind: "deleteField"; f: Field }
  | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls =
  "mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60";

const iconBtn =
  "flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

const handleBtn =
  "flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

// Kunci kolom: huruf kecil/angka/underscore, unik per buku
const uniqueKey = (label: string, taken: Set<string>) => {
  const base = slugify(label) || "kolom";
  let k = base;
  let n = 2;
  while (taken.has(k)) k = `${base}_${n++}`;
  return k;
};

const sameData = (a: Record<string, string>, b: Record<string, string>) => {
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

const friendlyError = (msg: string) =>
  msg.includes("participants_user_email_uidx") ? "Ada email yang sudah dipakai peserta lain." : msg;

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
const PlusIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="M12 5v14M5 12h14" /></Svg>
);
const PencilIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);
const TrashIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
  </Svg>
);
const GripIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={2.6}>
    <circle cx="9" cy="6" r="0.6" />
    <circle cx="15" cy="6" r="0.6" />
    <circle cx="9" cy="12" r="0.6" />
    <circle cx="15" cy="12" r="0.6" />
    <circle cx="9" cy="18" r="0.6" />
    <circle cx="15" cy="18" r="0.6" />
  </Svg>
);
const GearIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
);
const CopyIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Svg>
);
const SheetIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M4 9h16M4 15h16M10 9v12" />
  </Svg>
);

/* ---------- Drag untuk mengurutkan (mouse, sentuh, pena) ---------- */
type DragState = { id: string; from: number; over: number; y: number; step: number };

function useDragSort<T extends { id: string }>({
  items,
  enabled,
  onMove,
}: {
  items: T[];
  enabled: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const cleanup = useRef<(() => void) | null>(null);
  const onMoveRef = useRef(onMove);

  useEffect(() => {
    onMoveRef.current = onMove;
  });

  // Bersihkan listener jika komponen dilepas saat drag berlangsung
  useEffect(() => () => cleanup.current?.(), []);

  const register = (id: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(id, el);
    else els.current.delete(id);
  };

  function start(id: string, index: number, e: React.PointerEvent) {
    if (!enabled || cleanup.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    // Ukur posisi awal semua item (koordinat halaman)
    const sy0 = window.scrollY;
    const rects: { top: number; h: number }[] = [];
    for (const it of items) {
      const el = els.current.get(it.id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      rects.push({ top: r.top + sy0, h: r.height });
    }

    e.preventDefault();

    const me = rects[index];
    const step =
      rects.length < 2
        ? me.h
        : index < rects.length - 1
          ? rects[index + 1].top - me.top
          : me.top - rects[index - 1].top;
    const offset = e.clientY + sy0 - me.top;
    const minY = rects[0].top - me.top;
    const maxY = rects[rects.length - 1].top + rects[rects.length - 1].h - me.h - me.top;

    let lastY = e.clientY;
    let over = index;
    let raf = 0;
    const pointerId = e.pointerId;

    const compute = () => {
      const top = lastY + window.scrollY - offset;
      const center = top + me.h / 2;
      let o = 0;
      rects.forEach((r, i) => {
        if (i !== index && r.top + r.h / 2 < center) o++;
      });
      over = o;
      const y = Math.min(maxY, Math.max(minY, top - me.top));
      setDrag({ id, from: index, over: o, y, step });
    };

    const onPointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      lastY = ev.clientY;
      compute();
    };
    const onPointerUp = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finish(true);
    };
    const onPointerCancel = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      finish(false);
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") finish(false);
    };

    // Auto-scroll saat pointer dekat tepi layar
    const tick = () => {
      const vh = window.innerHeight;
      const edge = 80;
      let dy = 0;
      if (lastY < edge) dy = -Math.min(20, Math.ceil((edge - lastY) / 5));
      else if (lastY > vh - edge) dy = Math.min(20, Math.ceil((lastY - (vh - edge)) / 5));
      if (dy !== 0) {
        window.scrollBy(0, dy);
        compute();
      }
      raf = requestAnimationFrame(tick);
    };

    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKey);
    raf = requestAnimationFrame(tick);

    cleanup.current = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      document.body.style.userSelect = prevSelect;
      cleanup.current = null;
    };

    const finish = (commit: boolean) => {
      cleanup.current?.();
      setDrag(null);
      if (commit && over !== index) onMoveRef.current(index, over);
    };

    compute();
  }

  function styleFor(id: string, index: number): React.CSSProperties | undefined {
    if (!drag) return undefined;
    if (drag.id === id) {
      return { transform: `translateY(${drag.y}px)`, position: "relative", zIndex: 10, transition: "none" };
    }
    let shift = 0;
    if (drag.from < drag.over && index > drag.from && index <= drag.over) shift = -drag.step;
    else if (drag.from > drag.over && index >= drag.over && index < drag.from) shift = drag.step;
    return {
      transform: shift ? `translateY(${shift}px)` : undefined,
      transition: "transform 160ms ease",
    };
  }

  return { draggingId: drag?.id ?? null, register, start, styleFor };
}

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

function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busyLabel,
  busy,
  error,
  onConfirm,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} busy={busy}>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <TrashIcon className="h-6 w-6" />
      </div>
      <h2 id="modal-title" className="mt-4 text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-1 text-sm text-slate-500">{children}</p>

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
          disabled={busy}
          className="flex-1 cursor-pointer rounded-2xl bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-red-300"
        >
          {busy ? busyLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Dialog pengaturan (gerigi) ---------- */
function SettingsDialog({
  bookId,
  isEmpty,
  onNavigate,
  onClear,
  onClose,
}: {
  bookId: string;
  isEmpty: boolean;
  onNavigate: (href: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const optionCls =
    "flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <Modal onClose={onClose}>
      <h2 id="modal-title" className="text-lg font-semibold">
        Pengaturan peserta
      </h2>
      <p className="mt-1 text-sm text-slate-500">Tambahkan peserta dalam jumlah banyak atau kosongkan buku ini.</p>

      <ul className="mt-4 space-y-2">
        <li>
          <button
            type="button"
            disabled={!isEmpty}
            onClick={() => onNavigate(`/buku/${bookId}/peserta/salin`)}
            className={`${optionCls} ${isEmpty ? "cursor-pointer hover:border-blue-300 hover:bg-blue-50/40" : ""}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CopyIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900">Salin peserta dari buku lain</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {isEmpty
                  ? "Salin kolom data beserta pesertanya dari buku lain."
                  : "Tersedia saat buku ini kosong. Hapus semua peserta dan kolom dulu."}
              </span>
            </span>
            {isEmpty && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />}
          </button>
        </li>

        <li>
          <button
            type="button"
            onClick={() => onNavigate(`/buku/${bookId}/peserta/impor`)}
            className={`${optionCls} cursor-pointer hover:border-blue-300 hover:bg-blue-50/40`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <SheetIcon />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-slate-900">Impor dari Excel</span>
              <span className="mt-0.5 block text-xs text-slate-500">Unggah file Excel berisi daftar peserta.</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </li>

        <li>
          <button
            type="button"
            disabled={isEmpty}
            onClick={onClear}
            className={`${optionCls} border-red-100 ${isEmpty ? "" : "cursor-pointer hover:border-red-300 hover:bg-red-50/60"}`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <TrashIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-red-600">Hapus semua peserta &amp; kolom</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {isEmpty ? "Buku ini sudah kosong." : "Kosongkan buku ini beserta catatan kehadirannya."}
              </span>
            </span>
          </button>
        </li>
      </ul>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Tutup
      </button>
    </Modal>
  );
}

/* ---------- Dialog tambah / edit peserta ---------- */
function ParticipantDialog({
  member,
  initialValues,
  fields,
  onSubmit,
  onClose,
}: {
  member?: Member;
  initialValues?: Record<string, string>;
  fields: Field[];
  onSubmit: (row: NewRow) => Promise<string | null>;
  onClose: () => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [values, setValues] = useState<Record<string, string>>(initialValues ?? {});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Saat edit, tombol simpan aktif hanya jika ada yang berubah
  const changed = member
    ? name.trim() !== member.name ||
      (email.trim() || null) !== member.email ||
      fields.some((f) => (values[f.key] ?? "").trim() !== (initialValues?.[f.key] ?? "").trim())
    : true;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const n = name.trim();
    const em = email.trim();
    if (!n) return;
    if (em && !EMAIL_RE.test(em)) {
      setErr("Format email tidak valid.");
      return;
    }

    setBusy(true);
    setErr(null);
    const msg = await onSubmit({ name: n, email: em || null, values });
    if (msg) {
      setErr(msg);
      setBusy(false);
    }
    // Jika sukses, dialog ditutup oleh halaman induk
  }

  return (
    <Modal onClose={onClose} busy={busy}>
      <form onSubmit={submit}>
        <h2 id="modal-title" className="text-lg font-semibold">
          {member ? "Edit peserta" : "Tambah peserta"}
        </h2>
        {member && (
          <p className="mt-1 text-xs text-slate-500">
            Perubahan nama dan email berlaku di semua buku yang memuat peserta ini. Isi kolom data hanya berlaku di buku
            ini.
          </p>
        )}

        <label htmlFor="p-name" className="mt-4 block text-sm font-medium text-slate-700">
          Nama
        </label>
        <input
          id="p-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          className={inputCls}
        />

        <label htmlFor="p-email" className="mt-4 block text-sm font-medium text-slate-700">
          Email <span className="font-normal text-slate-400">(opsional)</span>
        </label>
        <input
          id="p-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy}
          className={inputCls}
        />

        {fields.map((f) => (
          <div key={f.id}>
            <label htmlFor={`p-${f.key}`} className="mt-4 block text-sm font-medium text-slate-700">
              {f.label} <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <input
              id={`p-${f.key}`}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              disabled={busy}
              className={inputCls}
            />
          </div>
        ))}

        {err && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {err}
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
            type="submit"
            disabled={!name.trim() || !changed || busy}
            className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {busy ? (member ? "Menyimpan..." : "Menambahkan...") : member ? "Simpan" : "Tambahkan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Dialog kolom data ---------- */
function FieldDialog({
  field,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  field: Field | null;
  busy: boolean;
  error: string | null;
  onSubmit: (label: string) => void;
  onClose: () => void;
}) {
  const [label, setLabel] = useState(field?.label ?? "");

  return (
    <Modal onClose={onClose} busy={busy}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim() && !busy) onSubmit(label.trim());
        }}
      >
        <h2 id="modal-title" className="text-lg font-semibold">
          {field ? "Ubah nama kolom" : "Tambah kolom"}
        </h2>

        <label htmlFor="f-label" className="mt-4 block text-sm font-medium text-slate-700">
          Nama kolom
        </label>
        <input
          id="f-label"
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={busy}
          placeholder="Contoh: NIM, Kelas, No. HP"
          className={inputCls}
        />
        <p className="mt-1.5 text-xs text-slate-500">
          {field
            ? "Hanya nama yang berubah. Isi kolom pada setiap peserta tetap aman."
            : "Kolom ini bisa diisi untuk setiap peserta di buku ini."}
        </p>

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
            type="submit"
            disabled={!label.trim() || busy}
            className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {busy ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Halaman ---------- */
export default function PesertaPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const [bookName, setBookName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [dataMap, setDataMap] = useState<DataMap>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [tab, setTab] = useState<"peserta" | "kolom">("peserta");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ModalState>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const closeModal = useCallback(() => setModal(null), []);

  function openModal(m: ModalState) {
    setModalError(null);
    setModal(m);
  }

  const isEmpty = members.length === 0 && fields.length === 0;

  /* ---------- Muat data ---------- */
  const load = useCallback(async () => {
    const [bookRes, bpRes, fieldRes, dataRes] = await Promise.all([
      supabase.from("books").select("name").eq("id", bookId).maybeSingle(),
      supabase
        .from("book_participants")
        .select("participant_id, sort_order, participants(id, name, email)")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("participant_fields")
        .select("id, key, label, sort_order")
        .eq("book_id", bookId)
        .order("sort_order", { ascending: true }),
      supabase.from("book_participant_data").select("participant_id, data").eq("book_id", bookId),
    ]);

    const err = bookRes.error || bpRes.error || fieldRes.error || dataRes.error;
    if (err) {
      setError(err.message || "Gagal memuat data.");
    } else if (!bookRes.data) {
      setNotFound(true);
    } else {
      setBookName(bookRes.data.name);

      const list: Member[] = [];
      for (const r of (bpRes.data ?? []) as unknown as BpRow[]) {
        const p = Array.isArray(r.participants) ? r.participants[0] : r.participants;
        if (p) list.push({ id: p.id, name: p.name, email: p.email, sort_order: r.sort_order });
      }
      setMembers(list);
      setFields((fieldRes.data ?? []) as Field[]);

      const map: DataMap = {};
      for (const r of (dataRes.data ?? []) as unknown as DataRow[]) {
        const d: Record<string, string> = {};
        for (const [k, v] of Object.entries(r.data ?? {})) {
          if (v !== null && v !== undefined && String(v) !== "") d[k] = String(v);
        }
        map[r.participant_id] = d;
      }
      setDataMap(map);
    }
    setLoading(false);
  }, [supabase, bookId]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  // Pesan sukses hilang sendiri
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(t);
  }, [notice]);

  /* ---------- Tambah peserta ---------- */
  async function addNew(row: NewRow): Promise<string | null> {
    const { data: created, error: e1 } = await supabase
      .from("participants")
      .insert({ name: row.name, email: row.email })
      .select("id")
      .single();
    if (e1 || !created) return friendlyError(e1?.message ?? "Gagal menambahkan peserta.");

    const pid = (created as { id: string }).id;

    const { error: e2 } = await supabase.from("book_participants").insert({ book_id: bookId, participant_id: pid });
    if (e2) {
      // Gagal dimasukkan ke buku: hapus peserta yang baru dibuat agar tidak jadi data yatim
      await supabase.from("participants").delete().eq("id", pid);
      return e2.message;
    }

    let warn: string | null = null;
    const data: Record<string, string> = {};
    for (const f of fields) {
      const v = (row.values[f.key] ?? "").trim();
      if (v) data[f.key] = v;
    }
    if (Object.keys(data).length > 0) {
      const { error: e3 } = await supabase
        .from("book_participant_data")
        .upsert({ book_id: bookId, participant_id: pid, data }, { onConflict: "book_id,participant_id" });
      if (e3) warn = `Peserta sudah ditambahkan, tetapi isi kolom gagal disimpan: ${e3.message}`;
    }

    await load();
    setModal(null);
    if (warn) setError(warn);
    else setNotice(`${row.name} ditambahkan.`);
    return null;
  }

  /* ---------- Edit peserta ---------- */
  async function editMember(m: Member, row: NewRow): Promise<string | null> {
    const { data: updated, error: e1 } = await supabase
      .from("participants")
      .update({ name: row.name, email: row.email })
      .eq("id", m.id)
      .select("id");
    if (e1 || !updated || updated.length === 0) {
      return friendlyError(e1?.message ?? "Gagal menyimpan perubahan.");
    }

    // Mulai dari data lama (supaya kunci kolom yang sudah tidak ada tidak ikut terhapus)
    const prev = dataMap[m.id] ?? {};
    const data: Record<string, string> = { ...prev };
    for (const f of fields) {
      const v = (row.values[f.key] ?? "").trim();
      if (v) data[f.key] = v;
      else delete data[f.key];
    }

    let warn: string | null = null;
    if (!sameData(prev, data)) {
      const { error: e2 } = await supabase
        .from("book_participant_data")
        .upsert({ book_id: bookId, participant_id: m.id, data }, { onConflict: "book_id,participant_id" });
      if (e2) warn = `Nama dan email sudah disimpan, tetapi isi kolom gagal disimpan: ${e2.message}`;
    }

    await load();
    setModal(null);
    if (warn) setError(warn);
    else setNotice(`${row.name} diperbarui.`);
    return null;
  }

  /* ---------- Keluarkan peserta dari buku ---------- */
  async function removeMember(m: Member) {
    if (busy) return;
    setBusy(true);
    setModalError(null);

    const { data, error: e } = await supabase
      .from("book_participants")
      .delete()
      .eq("book_id", bookId)
      .eq("participant_id", m.id)
      .select("participant_id");

    if (e || !data || data.length === 0) {
      setModalError(e?.message ?? "Gagal mengeluarkan peserta dari buku.");
      setBusy(false);
      return;
    }

    setModal(null);
    await load();
    setNotice(`${m.name} dikeluarkan dari buku.`);
    setBusy(false);
  }

  /* ---------- Hapus semua peserta dan kolom ---------- */
  async function clearAll() {
    if (busy) return;
    setBusy(true);
    setModalError(null);

    // Peserta dulu: kehadiran dan isi kolom ikut terhapus lewat cascade
    const { error: e1 } = await supabase.from("book_participants").delete().eq("book_id", bookId);
    if (e1) {
      setModalError(e1.message);
      await load();
      setBusy(false);
      return;
    }

    const { error: e2 } = await supabase.from("participant_fields").delete().eq("book_id", bookId);
    if (e2) {
      setModalError(`Peserta sudah dihapus, tetapi kolom gagal dihapus: ${e2.message}`);
      await load();
      setBusy(false);
      return;
    }

    setModal(null);
    setQuery("");
    await load();
    setNotice("Semua peserta dan kolom dihapus.");
    setBusy(false);
  }

  /* ---------- Ubah urutan ---------- */
  // Dipakai oleh drag dan tombol panah keyboard: pindahkan item dari indeks `from` ke `to`
  async function reorderMembers(from: number, to: number) {
    if (busy || from === to || to < 0 || to >= members.length) return;

    const old = new Map(members.map((m) => [m.id, m.sort_order]));
    const moved = [...members];
    const [item] = moved.splice(from, 1);
    moved.splice(to, 0, item);
    const next = moved.map((m, idx) => ({ ...m, sort_order: idx }));
    const changed = next.filter((m) => old.get(m.id) !== m.sort_order);

    setMembers(next);
    setBusy(true);
    setError(null);
    const results = await Promise.all(
      changed.map((m) =>
        supabase
          .from("book_participants")
          .update({ sort_order: m.sort_order })
          .eq("book_id", bookId)
          .eq("participant_id", m.id)
      )
    );
    const fail = results.find((r) => r.error);
    if (fail?.error) {
      setError(fail.error.message);
      await load();
    }
    setBusy(false);
  }

  async function reorderFields(from: number, to: number) {
    if (busy || from === to || to < 0 || to >= fields.length) return;

    const old = new Map(fields.map((f) => [f.id, f.sort_order]));
    const moved = [...fields];
    const [item] = moved.splice(from, 1);
    moved.splice(to, 0, item);
    const next = moved.map((f, idx) => ({ ...f, sort_order: idx }));
    const changed = next.filter((f) => old.get(f.id) !== f.sort_order);

    setFields(next);
    setBusy(true);
    setError(null);
    const results = await Promise.all(
      changed.map((f) => supabase.from("participant_fields").update({ sort_order: f.sort_order }).eq("id", f.id))
    );
    const fail = results.find((r) => r.error);
    if (fail?.error) {
      setError(fail.error.message);
      await load();
    }
    setBusy(false);
  }

  /* ---------- Kolom data ---------- */
  async function saveField(f: Field | null, label: string) {
    if (busy) return;
    setBusy(true);
    setModalError(null);

    if (f) {
      const { error: e } = await supabase.from("participant_fields").update({ label }).eq("id", f.id);
      if (e) {
        setModalError(e.message);
        setBusy(false);
        return;
      }
    } else {
      const key = uniqueKey(label, new Set(fields.map((x) => x.key)));
      const sort_order = fields.length > 0 ? Math.max(...fields.map((x) => x.sort_order)) + 1 : 0;
      const { error: e } = await supabase.from("participant_fields").insert({ book_id: bookId, key, label, sort_order });
      if (e) {
        setModalError(e.message);
        setBusy(false);
        return;
      }
    }

    setModal(null);
    await load();
    setNotice(f ? "Nama kolom diperbarui." : `Kolom ${label} ditambahkan.`);
    setBusy(false);
  }

  async function deleteField(f: Field) {
    if (busy) return;
    setBusy(true);
    setModalError(null);

    const { data, error: e } = await supabase.from("participant_fields").delete().eq("id", f.id).select("id");
    if (e || !data || data.length === 0) {
      setModalError(e?.message ?? "Gagal menghapus kolom.");
      setBusy(false);
      return;
    }

    setModal(null);
    await load();
    setNotice(`Kolom ${f.label} dihapus.`);
    setBusy(false);
  }

  /* ---------- Daftar tampil ---------- */
  const q = query.trim().toLowerCase();
  const searching = q.length > 0;
  const visible = useMemo(
    () =>
      members
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => !q || m.name.toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q)),
    [members, q]
  );

  // Drag peserta: tidak aktif saat mencari atau saat sedang menyimpan
  const drag = useDragSort({
    items: members,
    enabled: !searching && !busy,
    onMove: reorderMembers,
  });

  // Drag kolom data: tidak aktif saat sedang menyimpan
  const fieldDrag = useDragSort({
    items: fields,
    enabled: !busy,
    onMove: reorderFields,
  });

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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => router.push(`/buku/${bookId}`)}
            aria-label="Kembali ke buku"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-lg font-bold">Manajemen peserta</h1>
            <p className="truncate text-[11px] text-slate-500">{loading ? "\u00A0" : bookName}</p>
          </div>
          <button
            type="button"
            onClick={() => openModal({ kind: "settings" })}
            disabled={loading}
            aria-label="Pengaturan peserta"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-transparent text-blue-600 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <GearIcon className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
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

        {notice && (
          <div role="status" className="mb-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            <div className="h-11 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-12 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            <div className="h-16 animate-pulse rounded-3xl border border-slate-200 bg-white" />
            <div className="h-16 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        ) : (
          <>
            {/* Tab */}
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-white p-1" role="tablist">
              {(
                [
                  { v: "peserta", label: "Peserta", n: members.length },
                  { v: "kolom", label: "Kolom data", n: fields.length },
                ] as const
              ).map((t) => (
                <button
                  key={t.v}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.v}
                  onClick={() => setTab(t.v)}
                  className={`cursor-pointer rounded-xl py-2.5 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    tab === t.v ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {t.label} <span className={tab === t.v ? "text-blue-100" : "text-slate-400"}>{t.n}</span>
                </button>
              ))}
            </div>

            {tab === "peserta" ? (
              <>
                <button
                  type="button"
                  onClick={() => openModal({ kind: "add" })}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <PlusIcon />
                  Tambah peserta
                </button>

                {members.length > 6 && (
                  <div className="relative mt-3">
                    <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Cari peserta"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                )}

                {members.length === 0 ? (
                  <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <h2 className="text-sm font-semibold">Belum ada peserta</h2>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                      Tambahkan peserta untuk mulai mencatat kehadiran.
                    </p>
                  </div>
                ) : visible.length === 0 ? (
                  <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <h2 className="text-sm font-semibold">Tidak ada hasil</h2>
                    <p className="mt-1 text-xs text-slate-500">Coba kata kunci lain.</p>
                  </div>
                ) : (
                  <>
                    {searching ? (
                      <p className="mt-3 text-xs text-slate-500">Urutan tidak bisa diubah saat pencarian aktif.</p>
                    ) : members.length > 1 ? (
                      <p className="mt-3 text-xs text-slate-500">
                        Tahan ikon titik di kiri lalu geser untuk mengubah urutan.
                      </p>
                    ) : null}
                    <ul className="mt-3 space-y-2">
                      {visible.map(({ m, i }) => {
                        const dragging = drag.draggingId === m.id;
                        return (
                          <li
                            key={m.id}
                            ref={drag.register(m.id)}
                            style={drag.styleFor(m.id, i)}
                            className={`flex items-center gap-1.5 rounded-3xl border bg-white py-3 pl-2 pr-2 ${
                              dragging ? "border-blue-300 shadow-lg ring-2 ring-blue-100" : "border-slate-200"
                            }`}
                          >
                            {!searching && (
                              <button
                                type="button"
                                onPointerDown={(e) => drag.start(m.id, i, e)}
                                onContextMenu={(e) => e.preventDefault()}
                                onKeyDown={(e) => {
                                  if (e.key === "ArrowUp") {
                                    e.preventDefault();
                                    reorderMembers(i, i - 1);
                                  } else if (e.key === "ArrowDown") {
                                    e.preventDefault();
                                    reorderMembers(i, i + 1);
                                  }
                                }}
                                disabled={busy || members.length < 2}
                                aria-label={`Geser ${m.name}. Tekan panah atas atau bawah untuk memindahkan.`}
                                className={handleBtn}
                              >
                                <GripIcon />
                              </button>
                            )}
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-bold text-white ${
                                searching ? "ml-2" : ""
                              }`}
                            >
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="ml-1 min-w-0 flex-1 select-none">
                              <span className="block truncate text-sm font-medium">{m.name}</span>
                              <span className="block truncate text-[11px] text-slate-500">
                                {m.email || "Tanpa email"}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openModal({ kind: "editMember", m })}
                              disabled={busy}
                              aria-label={`Edit ${m.name}`}
                              className={iconBtn}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal({ kind: "removeMember", m })}
                              disabled={busy}
                              aria-label={`Keluarkan ${m.name} dari buku`}
                              className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openModal({ kind: "field", f: null })}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                >
                  <PlusIcon />
                  Tambah kolom
                </button>

                {fields.length === 0 ? (
                  <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                    <h2 className="text-sm font-semibold">Belum ada kolom data</h2>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                      Tambahkan kolom seperti NIM, kelas, atau nomor HP untuk menyimpan data tambahan tiap peserta.
                    </p>
                  </div>
                ) : (
                  <>
                    {fields.length > 1 && (
                      <p className="mt-3 text-xs text-slate-500">
                        Tahan ikon titik di kiri lalu geser untuk mengubah urutan.
                      </p>
                    )}
                    <ul className="mt-3 space-y-2">
                      {fields.map((f, i) => {
                        const dragging = fieldDrag.draggingId === f.id;
                        return (
                          <li
                            key={f.id}
                            ref={fieldDrag.register(f.id)}
                            style={fieldDrag.styleFor(f.id, i)}
                            className={`flex items-center gap-1.5 rounded-3xl border bg-white py-3 pl-2 pr-2 ${
                              dragging ? "border-blue-300 shadow-lg ring-2 ring-blue-100" : "border-slate-200"
                            }`}
                          >
                            <button
                              type="button"
                              onPointerDown={(e) => fieldDrag.start(f.id, i, e)}
                              onContextMenu={(e) => e.preventDefault()}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  reorderFields(i, i - 1);
                                } else if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  reorderFields(i, i + 1);
                                }
                              }}
                              disabled={busy || fields.length < 2}
                              aria-label={`Geser kolom ${f.label}. Tekan panah atas atau bawah untuk memindahkan.`}
                              className={handleBtn}
                            >
                              <GripIcon />
                            </button>
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[11px] font-bold text-white">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="ml-1 min-w-0 flex-1 select-none">
                              <span className="block truncate text-sm font-medium">{f.label}</span>
                              <span className="block truncate text-[11px] text-slate-500">Kunci: {f.key}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openModal({ kind: "field", f })}
                              disabled={busy}
                              aria-label={`Edit kolom ${f.label}`}
                              className={iconBtn}
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => openModal({ kind: "deleteField", f })}
                              disabled={busy}
                              aria-label={`Hapus kolom ${f.label}`}
                              className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Dialog */}
      {modal?.kind === "settings" && (
        <SettingsDialog
          bookId={bookId}
          isEmpty={isEmpty}
          onNavigate={(href) => router.push(href)}
          onClear={() => openModal({ kind: "clearAll" })}
          onClose={closeModal}
        />
      )}

      {modal?.kind === "clearAll" && (
        <ConfirmDialog
          title="Hapus semua peserta dan kolom?"
          confirmLabel="Hapus semua"
          busyLabel="Menghapus..."
          busy={busy}
          error={modalError}
          onConfirm={clearAll}
          onClose={closeModal}
        >
          <span className="font-medium text-slate-700">
            {members.length} peserta dan {fields.length} kolom data
          </span>{" "}
          di buku ini akan dihapus beserta seluruh catatan kehadiran dan isi kolomnya. Tindakan ini tidak bisa
          dibatalkan.
        </ConfirmDialog>
      )}

      {modal?.kind === "add" && <ParticipantDialog fields={fields} onSubmit={addNew} onClose={closeModal} />}

      {modal?.kind === "editMember" && (
        <ParticipantDialog
          key={modal.m.id}
          member={modal.m}
          initialValues={dataMap[modal.m.id]}
          fields={fields}
          onSubmit={(row) => editMember(modal.m, row)}
          onClose={closeModal}
        />
      )}

      {modal?.kind === "removeMember" && (
        <ConfirmDialog
          title="Keluarkan peserta dari buku?"
          confirmLabel="Keluarkan"
          busyLabel="Memproses..."
          busy={busy}
          error={modalError}
          onConfirm={() => removeMember(modal.m)}
          onClose={closeModal}
        >
          <span className="font-medium text-slate-700">&quot;{modal.m.name}&quot;</span> akan dikeluarkan dari buku ini
          beserta seluruh catatan kehadirannya.
        </ConfirmDialog>
      )}

      {modal?.kind === "field" && (
        <FieldDialog
          field={modal.f}
          busy={busy}
          error={modalError}
          onSubmit={(label) => saveField(modal.f, label)}
          onClose={closeModal}
        />
      )}

      {modal?.kind === "deleteField" && (
        <ConfirmDialog
          title="Hapus kolom data?"
          confirmLabel="Hapus"
          busyLabel="Menghapus..."
          busy={busy}
          error={modalError}
          onConfirm={() => deleteField(modal.f)}
          onClose={closeModal}
        >
          Kolom <span className="font-medium text-slate-700">&quot;{modal.f.label}&quot;</span> beserta isinya pada
          semua peserta di buku ini akan dihapus.
        </ConfirmDialog>
      )}
    </div>
  );
}
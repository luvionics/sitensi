"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import PesertaDetailModal from "../components/PesertaDetailModal";

type Status = "hadir" | "izin" | "alpa";
type Participant = { id: string; name: string };
type AttRow = { participant_id: string; tanggal: string; status: Status };
type Stat = { hadir: number; izin: number; alpa: number; total: number; pct: number };
type Preset = "all" | "month" | "lastmonth" | "custom";
type Sort = "daftar" | "tinggi" | "rendah";

type BpRow = {
  participant_id: string;
  participants: Participant | Participant[] | null;
};

type Access = "private" | "people" | "link";
type ShareRow = {
  id: string;
  token: string;
  access: Access;
  date_from: string | null;
  date_to: string | null;
};
type EmailRow = { id: string; email: string };

const SHARE_COLS = "id, token, access, date_from, date_to";
const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

// Urutan: Izin, Alpa, Hadir
const STATUS_KEYS: Status[] = ["izin", "alpa", "hadir"];

const PAGE_SIZE = 1000;

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const formatShort = (iso: string) =>
  parseISO(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const monthRange = (offset: number) => {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  return { from: toISO(first), to: toISO(last) };
};

const emptyStat = (): Stat => ({ hadir: 0, izin: 0, alpa: 0, total: 0, pct: 0 });

const finish = (s: Stat): Stat => {
  const total = s.hadir + s.izin + s.alpa;
  return { ...s, total, pct: total > 0 ? Math.round((s.hadir / total) * 100) : 0 };
};

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const rangeText = (from: string | null, to: string | null) =>
  !from && !to
    ? "Semua tanggal"
    : `${from ? formatShort(from) : "Awal"} – ${to ? formatShort(to) : "Sekarang"}`;

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
const ChevronDown = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="m6 9 6 6 6-6" /></Svg>
);
const SearchIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
const ShareIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4" />
    <path d="m15.4 6.5-6.8 4" />
  </Svg>
);
const CloseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Svg>
);
const LockIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <rect x="4" y="11" width="16" height="10" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </Svg>
);
const UsersIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
    <path d="M18 14.2A6.5 6.5 0 0 1 21.5 20" />
  </Svg>
);
const GlobeIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18" />
    <path d="M12 3a14 14 0 0 0 0 18" />
  </Svg>
);
const CheckIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="m5 12 5 5 9-10" /></Svg>
);
const LinkIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </Svg>
);
const CalendarIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </Svg>
);
// Ikon status
const DocIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h6" />
  </Svg>
);
const XCircleIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Svg>
);
const CheckCircleIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </Svg>
);

const STATUS_UI: Record<
  Status,
  { label: string; badge: string; icon: string; num: string; Icon: (p: IconProps) => React.ReactElement }
> = {
  izin: {
    label: "Izin",
    badge: "bg-amber-600/15 text-amber-800",
    icon: "text-amber-500",
    num: "text-amber-600",
    Icon: DocIcon,
  },
  alpa: {
    label: "Alpa",
    badge: "bg-red-600/15 text-red-800",
    icon: "text-red-500",
    num: "text-red-600",
    Icon: XCircleIcon,
  },
  hadir: {
    label: "Hadir",
    badge: "bg-emerald-600/15 text-emerald-800",
    icon: "text-emerald-500",
    num: "text-emerald-600",
    Icon: CheckCircleIcon,
  },
};

/* ---------- Skeleton ---------- */
const PAGE_CSS = `
.rk-sk{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:rk-shimmer 1.4s ease-in-out infinite}
@keyframes rk-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media (prefers-reduced-motion: reduce){.rk-sk{animation:none}}
`;

function Sk({ className = "" }: { className?: string }) {
  return <div className={`rk-sk ${className}`} aria-hidden="true" />;
}

const chipBase =
  "cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60";
const chipOn = "border-blue-600 bg-blue-600 text-white";
const chipOff = "border-slate-300 bg-transparent text-slate-600 hover:border-slate-400 hover:bg-slate-100";

const headerBtn =
  "flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

const shareBtn =
  "flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-blue-600 px-3.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-blue-600";

/* ---------- Opsi akses ---------- */
const ACCESS_UI: Record<
  Access,
  { label: string; desc: string; Icon: (p: IconProps) => React.ReactElement; tone: string }
> = {
  private: {
    label: "Hanya Anda",
    desc: "Tidak ada orang lain yang bisa membuka.",
    Icon: LockIcon,
    tone: "bg-slate-100 text-slate-600",
  },
  people: {
    label: "Sebagian orang",
    desc: "Hanya email yang Anda tambahkan, setelah login.",
    Icon: UsersIcon,
    tone: "bg-blue-600/10 text-blue-700",
  },
  link: {
    label: "Siapa saja yang memiliki tautan",
    desc: "Siapa pun dengan tautan bisa melihat, tanpa login.",
    Icon: GlobeIcon,
    tone: "bg-emerald-600/15 text-emerald-700",
  },
};
const ACCESS_KEYS: Access[] = ["private", "people", "link"];

/* ---------- Modal Bagikan ---------- */
function ShareModal({
  supabase,
  bookId,
  from,
  to,
  onClose,
}: {
  supabase: SupabaseClient;
  bookId: string;
  from: string;
  to: string;
  onClose: () => void;
}) {
  const [share, setShare] = useState<ShareRow | null>(null);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  const access: Access = share?.access ?? "private";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("recap_shares")
        .select(SHARE_COLS)
        .eq("book_id", bookId)
        .is("participant_id", null)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      const row = (data as ShareRow | null) ?? null;
      setShare(row);

      if (row) {
        const { data: em, error: emErr } = await supabase
          .from("recap_share_emails")
          .select("id, email")
          .eq("share_id", row.id)
          .order("created_at", { ascending: true });
        if (cancelled) return;
        if (emErr) setErr(emErr.message);
        else setEmails((em ?? []) as EmailRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, bookId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menuOpen) setMenuOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, menuOpen]);

  const link = share && typeof window !== "undefined" ? `${window.location.origin}/rekap/${share.token}` : "";

  /* Ganti mode akses; baris dibuat saat pertama kali memilih selain "Hanya Anda" */
  async function changeAccess(next: Access) {
    setMenuOpen(false);
    if (next === access) return;
    setErr(null);

    if (!share) {
      if (next === "private") return;
      setBusy(true);
      const { data, error } = await supabase
        .from("recap_shares")
        .insert({
          book_id: bookId,
          access: next,
          enabled: true,
          date_from: from || null,
          date_to: to || null,
        })
        .select(SHARE_COLS)
        .single();
      if (error) setErr(error.message);
      else setShare(data as ShareRow);
      setBusy(false);
      return;
    }

    setBusy(true);
    const { data, error } = await supabase
      .from("recap_shares")
      .update({ access: next, enabled: next !== "private" })
      .eq("id", share.id)
      .select(SHARE_COLS)
      .single();
    if (error) setErr(error.message);
    else setShare(data as ShareRow);
    setBusy(false);
  }

  async function patchRange(patch: { date_from: string | null; date_to: string | null }) {
    if (!share) return;
    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from("recap_shares")
      .update(patch)
      .eq("id", share.id)
      .select(SHARE_COLS)
      .single();
    if (error) setErr(error.message);
    else setShare(data as ShareRow);
    setBusy(false);
  }

  /* Tambah satu atau beberapa email (dipisah koma, spasi, titik koma, atau baris baru) */
  async function addEmails(raw: string) {
    if (!share) return;
    const parts = raw
      .split(/[\s,;]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return;

    const invalid = parts.filter((p) => !EMAIL_RE.test(p));
    if (invalid.length > 0) {
      setErr(`Email tidak valid: ${invalid.join(", ")}`);
      return;
    }

    const existing = new Set(emails.map((e) => e.email));
    const fresh = Array.from(new Set(parts)).filter((p) => !existing.has(p));
    if (fresh.length === 0) {
      setEmailInput("");
      return;
    }

    setBusy(true);
    setErr(null);
    const { data, error } = await supabase
      .from("recap_share_emails")
      .insert(fresh.map((email) => ({ share_id: share.id, email })))
      .select("id, email");
    if (error) {
      setErr(error.message);
    } else {
      setEmails((prev) => [...prev, ...((data ?? []) as EmailRow[])]);
      setEmailInput("");
    }
    setBusy(false);
  }

  async function removeEmail(id: string) {
    setErr(null);
    const prev = emails;
    setEmails((list) => list.filter((e) => e.id !== id));
    const { error } = await supabase.from("recap_share_emails").delete().eq("id", id);
    if (error) {
      setEmails(prev);
      setErr(error.message);
    }
  }

  async function copyLink() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (!link || !navigator.share) return;
    try {
      await navigator.share({ title: "Rekapitulasi kehadiran", url: link });
    } catch {
      /* dibatalkan pengguna */
    }
  }

  const sameRange = !!share && (share.date_from ?? "") === from && (share.date_to ?? "") === to;
  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const Current = ACCESS_UI[access];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bagikan rekapitulasi"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Bagikan rekapitulasi</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {err && (
          <p role="alert" className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {err}
          </p>
        )}

        {loading ? (
          <div className="mt-4 space-y-2">
            <Sk className="h-16 w-full rounded-2xl" />
            <Sk className="h-10 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Dropdown akses */}
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-slate-500">Akses</p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  disabled={busy}
                  aria-haspopup="listbox"
                  aria-expanded={menuOpen}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${Current.tone}`}>
                    <Current.Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{Current.label}</span>
                    <span className="block truncate text-[11px] text-slate-500">{Current.desc}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                    <ul
                      role="listbox"
                      aria-label="Pilih akses"
                      className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      {ACCESS_KEYS.map((k) => {
                        const ui = ACCESS_UI[k];
                        const selected = k === access;
                        return (
                          <li key={k} role="option" aria-selected={selected}>
                            <button
                              type="button"
                              onClick={() => changeAccess(k)}
                              className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                            >
                              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${ui.tone}`}>
                                <ui.Icon className="h-[18px] w-[18px]" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium">{ui.label}</span>
                                <span className="block text-[11px] text-slate-500">{ui.desc}</span>
                              </span>
                              {selected && <CheckIcon className="h-4 w-4 shrink-0 text-blue-600" />}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </div>

            {/* Daftar email (mode sebagian orang) */}
            {access === "people" && share && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-slate-500">Orang yang bisa membuka</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="off"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "," || e.key === " ") {
                        e.preventDefault();
                        addEmails(emailInput);
                      }
                    }}
                    onPaste={(e) => {
                      const text = e.clipboardData.getData("text");
                      if (/[\s,;]/.test(text.trim())) {
                        e.preventDefault();
                        addEmails(text);
                      }
                    }}
                    placeholder="Tambahkan email"
                    aria-label="Tambahkan email"
                    disabled={busy}
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                  />
                  <button
                    type="button"
                    onClick={() => addEmails(emailInput)}
                    disabled={busy || !emailInput.trim()}
                    className="shrink-0 cursor-pointer rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Tambah
                  </button>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Pisahkan dengan koma atau spasi untuk menambah banyak sekaligus. Mereka perlu login dengan email ini.
                </p>

                {emails.length > 0 ? (
                  <ul className="mt-2.5 max-h-40 space-y-1.5 overflow-y-auto">
                    {emails.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-2.5 rounded-2xl bg-slate-50 py-1.5 pl-2 pr-1.5"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[10px] font-semibold text-white">
                          {e.email.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{e.email}</span>
                        <button
                          type="button"
                          onClick={() => removeEmail(e.id)}
                          aria-label={`Hapus ${e.email}`}
                          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <CloseIcon className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2.5 rounded-2xl border border-dashed border-slate-300 px-3 py-3 text-center text-xs text-slate-500">
                    Belum ada email. Tambahkan minimal satu agar ada yang bisa membuka.
                  </p>
                )}
              </div>
            )}

            {/* Tautan */}
            {access !== "private" && share && (
              <div>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Tautan rekapitulasi"
                    className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {copied ? <CheckIcon /> : <LinkIcon />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                </div>
                {canNativeShare && (
                  <button
                    type="button"
                    onClick={nativeShare}
                    className="mt-2 w-full cursor-pointer rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Bagikan lewat aplikasi lain
                  </button>
                )}
              </div>
            )}

            {/* Rentang tanggal */}
            {access !== "private" && share && (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-medium text-slate-500">Rentang tanggal yang dibagikan</p>
                <p className="mt-0.5 text-sm font-medium">{rangeText(share.date_from, share.date_to)}</p>
                {!sameRange && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => patchRange({ date_from: from || null, date_to: to || null })}
                    className="mt-2 cursor-pointer text-xs font-medium text-blue-700 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Ganti dengan filter saat ini ({rangeText(from || null, to || null)})
                  </button>
                )}
              </div>
            )}

            {access === "private" && (
              <p className="text-xs text-slate-500">
                Pilih "Sebagian orang" atau "Siapa saja yang memiliki tautan" untuk membuat tautan yang bisa dibagikan.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RekapPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const bookId = params.id;

  const [bookName, setBookName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter tanggal (kosong = tanpa batas)
  const [preset, setPreset] = useState<Preset>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState<{ key: string; rows: AttRow[] } | null>(null);
  const [sort, setSort] = useState<Sort>("daftar");

  // Pencarian: tombol "Cari peserta" berganti menjadi input di baris yang sama
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Modal detail peserta: cukup memegang id-nya
  const [detailId, setDetailId] = useState<string | null>(null);
  const openDetail = useCallback((id: string) => setDetailId(id), []);
  const closeDetail = useCallback(() => setDetailId(null), []);

  // Bagikan
  const [shareOpen, setShareOpen] = useState(false);
  const closeShare = useCallback(() => setShareOpen(false), []);

  /* ---------- Muat buku & peserta ---------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [bookRes, bpRes] = await Promise.all([
        supabase.from("books").select("name").eq("id", bookId).maybeSingle(),
        supabase
          .from("book_participants")
          .select("participant_id, participants(id, name)")
          .eq("book_id", bookId)
          .order("sort_order", { ascending: true }),
      ]);
      if (cancelled) return;

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
      setBaseLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, bookId]);

  /* ---------- Muat absensi sesuai rentang tanggal ---------- */
  const invalidRange = !!from && !!to && from > to;
  const rangeKey = `${from}|${to}`;

  useEffect(() => {
    if (invalidRange) return;
    let cancelled = false;
    (async () => {
      const all: AttRow[] = [];
      let offset = 0;
      for (;;) {
        let q = supabase
          .from("attendance")
          .select("participant_id, tanggal, status")
          .eq("book_id", bookId)
          .order("tanggal", { ascending: true })
          .order("participant_id", { ascending: true })
          .range(offset, offset + PAGE_SIZE - 1);
        if (from) q = q.gte("tanggal", from);
        if (to) q = q.lte("tanggal", to);

        const { data: chunk, error: err } = await q;
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setData({ key: rangeKey, rows: [] });
          return;
        }
        all.push(...((chunk ?? []) as AttRow[]));
        if (!chunk || chunk.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      setError(null);
      setData({ key: rangeKey, rows: all });
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase, bookId, from, to, rangeKey, invalidRange]);

  const dataLoading = !invalidRange && (!data || data.key !== rangeKey);
  const rows = useMemo(() => (invalidRange || !data || data.key !== rangeKey ? [] : data.rows), [
    invalidRange,
    data,
    rangeKey,
  ]);

  /* ---------- Hitung statistik ---------- */
  const { perPerson, overall, dayCount } = useMemo(() => {
    const map = new Map<string, Stat>();
    const days = new Set<string>();
    const sum = emptyStat();
    for (const r of rows) {
      const s = map.get(r.participant_id) ?? emptyStat();
      s[r.status]++;
      map.set(r.participant_id, s);
      sum[r.status]++;
      days.add(r.tanggal);
    }
    for (const [k, v] of map) map.set(k, finish(v));
    return { perPerson: map, overall: finish(sum), dayCount: days.size };
  }, [rows]);

  const q = query.trim().toLowerCase();
  const list = useMemo(() => {
    const items = participants
      .map((p, i) => ({ p, no: i + 1, stat: perPerson.get(p.id) ?? emptyStat() }))
      .filter(({ p }) => p.name.toLowerCase().includes(q));

    if (sort === "daftar") return items;
    const dir = sort === "tinggi" ? -1 : 1;
    return [...items].sort((a, b) => {
      // Peserta tanpa catatan selalu di bawah
      if (a.stat.total === 0 && b.stat.total === 0) return a.no - b.no;
      if (a.stat.total === 0) return 1;
      if (b.stat.total === 0) return -1;
      return (a.stat.pct - b.stat.pct) * dir || a.no - b.no;
    });
  }, [participants, perPerson, q, sort]);

  /* ---------- Aksi filter ---------- */
  function applyPreset(p: Preset) {
    setPreset(p);
    if (p === "all") {
      setFrom("");
      setTo("");
    } else if (p === "month") {
      const r = monthRange(0);
      setFrom(r.from);
      setTo(r.to);
    } else if (p === "lastmonth") {
      const r = monthRange(-1);
      setFrom(r.from);
      setTo(r.to);
    }
  }

  const rangeLabel = rangeText(from || null, to || null);

  /* ---------- Pencarian ---------- */
  function openSearch() {
    setSearchOpen(true);
  }

  // Menutup input sekaligus menghapus kata kunci
  function closeSearch() {
    setQuery("");
    setSearchOpen(false);
  }

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [searchOpen]);

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

  const dateInputCls =
    "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <style>{PAGE_CSS}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-slate-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex w-28 shrink-0 justify-start">
            <button
              type="button"
              onClick={() => router.push(`/buku/${bookId}`)}
              aria-label="Kembali ke buku"
              className={headerBtn}
            >
              <ChevronLeft />
            </button>
          </div>

          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate text-lg font-bold">Rekapitulasi</h1>
            <p className="truncate text-[11px] text-slate-500">{baseLoading ? "\u00A0" : bookName}</p>
          </div>

          <div className="flex w-28 shrink-0 justify-end">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              disabled={baseLoading}
              className={shareBtn}
            >
              <ShareIcon className="h-[18px] w-[18px]" />
              Bagikan
            </button>
          </div>
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

        {baseLoading ? (
          <div className="space-y-3">
            <div className="rk-sk h-40 rounded-3xl border border-slate-200" />
            <div className="rk-sk h-11 rounded-2xl border border-slate-200" />
            <div className="h-24 animate-pulse rounded-3xl border border-slate-200 bg-white" />
          </div>
        ) : (
          <>
            {/* Filter + ringkasan */}
            <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => applyPreset("all")} className={`${chipBase} ${preset === "all" ? chipOn : chipOff}`}>
                  Semua
                </button>
                <button type="button" onClick={() => applyPreset("month")} className={`${chipBase} ${preset === "month" ? chipOn : chipOff}`}>
                  Bulan ini
                </button>
                <button type="button" onClick={() => applyPreset("lastmonth")} className={`${chipBase} ${preset === "lastmonth" ? chipOn : chipOff}`}>
                  Bulan lalu
                </button>
                <button type="button" onClick={() => setPreset("custom")} className={`${chipBase} ${preset === "custom" ? chipOn : chipOff}`}>
                  Kustom
                </button>
              </div>

              {preset === "custom" && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">Dari</span>
                    <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateInputCls} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-medium text-slate-500">Sampai</span>
                    <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateInputCls} />
                  </label>
                </div>
              )}

              {invalidRange && (
                <p role="alert" className="mt-2 text-xs text-red-600">
                  Tanggal awal tidak boleh lebih besar dari tanggal akhir.
                </p>
              )}

              <p className="mt-3 text-xs text-slate-500">{rangeLabel}</p>

              {dataLoading ? (
                <div className="mt-3 space-y-2" role="status" aria-live="polite">
                  <span className="sr-only">Memuat rekap</span>
                  <Sk className="h-11 w-full rounded-2xl" />
                  <Sk className="h-2 w-full rounded-full" />
                </div>
              ) : (
                <>
                  {/* Total tipis dengan ikon SVG */}
                  <ul
                    aria-label="Ringkasan kehadiran"
                    className="mt-3 grid h-11 grid-cols-4 items-center divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50"
                  >
                    {STATUS_KEYS.map((s) => {
                      const ui = STATUS_UI[s];
                      return (
                        <li
                          key={s}
                          title={ui.label}
                          aria-label={`${ui.label}: ${overall[s]}`}
                          className="flex items-center justify-center gap-1.5 px-1"
                        >
                          <ui.Icon className={`h-4 w-4 shrink-0 ${ui.icon}`} />
                          <span className={`text-sm font-bold leading-none ${ui.num}`}>{overall[s]}</span>
                          <span className="hidden text-[11px] text-slate-500 sm:inline">{ui.label}</span>
                        </li>
                      );
                    })}
                    <li
                      title="Hari"
                      aria-label={`Hari: ${dayCount}`}
                      className="flex items-center justify-center gap-1.5 px-1"
                    >
                      <CalendarIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="text-sm font-bold leading-none text-slate-600">{dayCount}</span>
                      <span className="hidden text-[11px] text-slate-500 sm:inline">Hari</span>
                    </li>
                  </ul>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-600/70" style={{ width: `${overall.pct}%` }} />
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      Kehadiran <span className="font-semibold text-slate-900">{overall.total > 0 ? `${overall.pct}%` : "–"}</span>
                    </span>
                  </div>
                </>
              )}
            </section>

            {/* Tombol cari / input cari + urutan dalam satu baris */}
            <div className="mt-3 flex items-center gap-2">
              {searchOpen ? (
                <div role="search" className="relative min-w-0 flex-1">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="text"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        closeSearch();
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    placeholder="Cari peserta"
                    aria-label="Cari peserta"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-9 pr-11 text-base placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="button"
                    onClick={closeSearch}
                    aria-label="Tutup pencarian"
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={openSearch}
                  aria-label="Cari peserta"
                  className="flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98]"
                >
                  <SearchIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate">Cari peserta</span>
                </button>
              )}

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="Urutkan"
                className={`h-11 cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 ${
                  searchOpen ? "w-28 shrink-0 sm:w-auto" : "shrink-0"
                }`}
              >
                <option value="daftar">Urut daftar</option>
                <option value="tinggi">Kehadiran tertinggi</option>
                <option value="rendah">Kehadiran terendah</option>
              </select>
            </div>

            {/* Daftar peserta */}
            {participants.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <h2 className="text-sm font-semibold">Belum ada peserta</h2>
                <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                  Tambahkan peserta lewat menu Manajemen peserta.
                </p>
              </div>
            ) : list.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <h2 className="text-sm font-semibold">Tidak ada hasil</h2>
                <p className="mt-1 text-xs text-slate-500">Coba kata kunci lain.</p>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {list.map(({ p, no, stat }) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => openDetail(p.id)}
                      className="block w-full cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-xs font-semibold text-white">
                          {initials(p.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="block truncate text-[11px] text-slate-400">
                            No. {pad(no)} · {stat.total} hari tercatat
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-base font-bold">{stat.total > 0 ? `${stat.pct}%` : "–"}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                      </div>

                      <div className="mt-3 flex gap-1.5">
                        {STATUS_KEYS.map((s) => {
                          const ui = STATUS_UI[s];
                          return (
                            <span
                              key={s}
                              className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-1 text-center text-[11px] font-medium ${ui.badge}`}
                            >
                              <ui.Icon className="h-3.5 w-3.5 shrink-0" />
                              {ui.label} <span className="font-bold">{dataLoading ? "–" : stat[s]}</span>
                            </span>
                          );
                        })}
                      </div>

                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-600/70" style={{ width: `${dataLoading ? 0 : stat.pct}%` }} />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      {/* Modal detail peserta: mandiri, cukup diberi id buku dan id peserta */}
      {detailId && (
        <PesertaDetailModal key={detailId} bookId={bookId} participantId={detailId} onClose={closeDetail} />
      )}

      {/* Modal bagikan */}
      {shareOpen && (
        <ShareModal supabase={supabase} bookId={bookId} from={from} to={to} onClose={closeShare} />
      )}
    </div>
  );
}
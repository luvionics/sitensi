"use client";

import { useEffect, useMemo, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import ModalShell from "./ModalShell";
import { CopyIcon, ShareIcon, XIcon } from "./icons";

type Props = {
  bookId: string;
  participantId?: string;
  participantName?: string;
  defaultEmail?: string | null;
  onRequestEditEmail?: () => void;
  onClose: () => void;
  onNotice?: (message: string, error?: boolean) => void;
};

type ShareRow = {
  token: string;
  enabled: boolean;
  date_from: string | null;
  date_to: string | null;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const today = () => new Date().toISOString().slice(0, 10);
const monthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

export default function ShareRecapSheet({
  bookId,
  participantId,
  participantName,
  defaultEmail,
  onRequestEditEmail,
  onClose,
  onNotice,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState<ShareRow | null>(null);
  const [period, setPeriod] = useState<"all" | "month" | "range">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [draft, setDraft] = useState("");
  const [emails, setEmails] = useState<string[]>([]);
  const [invalidEmail, setInvalidEmail] = useState("");
  const [participantEmails, setParticipantEmails] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const cleanDates = period === "month"
    ? { from: monthStart(), to: today() }
    : period === "range"
      ? { from: from || null, to: to || null }
      : { from: null, to: null };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let query = supabase.from("recap_shares").select("token, enabled, date_from, date_to").eq("book_id", bookId);
      query = participantId ? query.eq("participant_id", participantId) : query.is("participant_id", null);
      const { data, error } = await query.maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        const row = data as ShareRow;
        setShare(row);
        if (row.date_from && row.date_to) setPeriod(row.date_from === monthStart() ? "month" : "range");
        setFrom(row.date_from ?? "");
        setTo(row.date_to ?? "");
      }
      setLoading(false);
    }
    void load();
    if (!participantId) {
      void supabase.from("participants").select("email").eq("book_id", bookId).not("email", "is", null).then(({ data }) => {
        if (!cancelled) {
          setParticipantEmails([...new Set((data ?? [])
            .map((row: { email: string }) => row.email?.trim().toLowerCase() ?? "")
            .filter(Boolean))]);
        }
      });
    }
    return () => { cancelled = true; };
  }, [bookId, participantId, supabase]);

  async function ensureShare(nextDates = cleanDates) {
    setBusy(true);
    let query = supabase.from("recap_shares").select("token, enabled, date_from, date_to").eq("book_id", bookId);
    query = participantId ? query.eq("participant_id", participantId) : query.is("participant_id", null);
    let { data } = await query.maybeSingle();
    if (!data) {
      const { data: inserted, error } = await supabase.from("recap_shares").insert({
        book_id: bookId,
        participant_id: participantId ?? null,
        date_from: nextDates.from,
        date_to: nextDates.to,
        enabled: true,
      }).select("token, enabled, date_from, date_to").single();
      if (error) {
        setBusy(false);
        onNotice?.(error.message, true);
        return null;
      }
      data = inserted;
    }
    const row = data as ShareRow;
    setShare(row);
    setBusy(false);
    return row;
  }

  async function savePeriod(nextDates = cleanDates) {
    if (!share) return;
    setBusy(true);
    const { error } = await supabase.from("recap_shares").update({
      date_from: nextDates.from,
      date_to: nextDates.to,
    }).eq("token", share.token);
    setBusy(false);
    if (error) onNotice?.(error.message, true);
  }

  async function toggleEnabled(enabled: boolean) {
    if (!share) return;
    setBusy(true);
    const { error } = await supabase.from("recap_shares").update({ enabled }).eq("token", share.token);
    if (!error) setShare({ ...share, enabled });
    else onNotice?.(error.message, true);
    setBusy(false);
  }

  async function regenerate() {
    if (!share || !window.confirm("Buat tautan baru? Tautan lama tidak akan bisa digunakan lagi.")) return;
    setBusy(true);
    const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const { error } = await supabase.from("recap_shares").update({ token }).eq("token", share.token);
    if (!error) setShare({ ...share, token });
    else onNotice?.(error.message, true);
    setBusy(false);
  }

  const publicUrl = share && typeof window !== "undefined"
    ? `${window.location.origin}/rekap/${share.token}`
    : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = publicUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotice?.("Tautan rekap berhasil disalin.");
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: participantName ? `Rekap ${participantName}` : "Rekap buku absen", url: publicUrl });
      } catch {
        return;
      }
    } else {
      await copy();
    }
  }

  function splitEmails(value: string) {
    return value.split(/[\s,;\n]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
  }

  function addEmails(values: string[]) {
    const next = [...emails];
    let invalid = "";
    values.forEach((value) => {
      if (!emailPattern.test(value)) {
        invalid = value;
      } else if (!next.some((email) => email.toLowerCase() === value.toLowerCase())) {
        next.push(value);
      }
    });
    setEmails(next.slice(0, 20));
    setInvalidEmail(invalid);
    setDraft("");
  }

  function onDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === "," || event.key === " ") {
      event.preventDefault();
      addEmails(splitEmails(draft));
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (/[\s,;\n]/.test(text)) {
      event.preventDefault();
      addEmails(splitEmails(`${draft}${text}`));
    }
  }

  async function sendEmail(emailList = emails) {
    if (!emailList.length || emailList.length > 20 || busy) return;
    setBusy(true);
    const response = await fetch("/api/rekap/kirim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookId, participantId, emails: emailList, dateFrom: cleanDates.from, dateTo: cleanDates.to }),
    });
    const result = await response.json().catch(() => ({ error: "Respons server tidak valid." }));
    setBusy(false);
    if (!response.ok) {
      onNotice?.(result.error ?? "Email gagal dikirim.", true);
      return;
    }
    const failed = result.results?.filter((item: { sent: boolean }) => !item.sent) ?? [];
    if (failed.length) {
      onNotice?.(`Gagal dikirim ke: ${failed.map((item: { email: string }) => item.email).join(", ")}`, true);
    } else {
      onNotice?.(`Email berhasil dikirim ke ${emailList.length} penerima.`);
      setEmails([]);
    }
  }

  const title = participantId ? `Bagikan rekap ${participantName ?? "peserta"}` : "Bagikan rekap buku";

  return (
    <ModalShell layer="z-[80]" onClose={onClose} labelledBy="share-recap-title" panelClassName="overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <h2 id="share-recap-title" className="text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><XIcon /></button>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700">Periode</label>
        <select value={period} disabled={busy} onChange={(event) => { const value = event.target.value as typeof period; setPeriod(value); void savePeriod(value === "month" ? { from: monthStart(), to: today() } : value === "all" ? { from: null, to: null } : { from, to }); }} className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm">
          <option value="all">Semua</option>
          <option value="month">Bulan ini</option>
          <option value="range">Rentang tanggal</option>
        </select>
        {period === "range" && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input aria-label="Tanggal mulai" type="date" value={from} onChange={(e) => setFrom(e.target.value)} onBlur={() => void savePeriod({ from, to })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input aria-label="Tanggal selesai" type="date" value={to} onChange={(e) => setTo(e.target.value)} onBlur={() => void savePeriod({ from, to })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </div>
        )}
      </div>

      {participantId && (
        <section className="mt-5 rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold">Kirim ke email yang tersimpan</h3>
          {defaultEmail ? (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5"><span className="min-w-0 flex-1 truncate text-sm">{defaultEmail}</span><button type="button" disabled={busy} onClick={() => void sendEmail([defaultEmail])} className="rounded-xl bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">Kirim</button></div>
          ) : (
            <div className="mt-2 text-sm text-slate-500"><p>Peserta ini belum punya email</p><button type="button" onClick={onRequestEditEmail} className="mt-2 font-medium text-blue-600">Isi email</button></div>
          )}
        </section>
      )}

      <section className="mt-5 rounded-2xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold">Kirim ke email lain</h3>
        <div className="mt-3 flex flex-wrap gap-2 rounded-xl border border-slate-200 px-2 py-2 focus-within:border-blue-500">
          {emails.map((email) => (
            <span key={email} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-700">{email}<button type="button" aria-label={`Hapus ${email}`} onClick={() => setEmails((list) => list.filter((item) => item !== email))} className="text-blue-400">×</button></span>
          ))}
          <input value={draft} onChange={(e) => { setDraft(e.target.value); setInvalidEmail(""); }} onKeyDown={onDraftKeyDown} onPaste={onPaste} onBlur={() => draft && addEmails(splitEmails(draft))} placeholder="Tambah email..." className="min-w-32 flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none" />
        </div>
        {invalidEmail && <p className="mt-1 text-xs text-red-600">Email tidak valid: {invalidEmail}</p>}
        {!participantId && participantEmails.length > 0 && (
          <details className="mt-3 rounded-xl bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-medium">Pilih dari email peserta di buku ini</summary>
            <div className="mt-2 max-h-32 space-y-2 overflow-y-auto">
              {participantEmails.map((email) => (
                <label key={email} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={emails.includes(email)} onChange={(e) => setEmails((list) => e.target.checked && !list.includes(email) ? [...list, email].slice(0, 20) : list.filter((item) => item !== email))} />{email}</label>
              ))}
            </div>
          </details>
        )}
        <button type="button" disabled={!emails.length || emails.length > 20 || busy} onClick={() => void sendEmail()} className="mt-3 w-full rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white disabled:bg-blue-300">{busy ? "Mengirim..." : "Kirim email"}</button>
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold">Bagikan lewat tautan</h3>
        <button type="button" disabled={loading || busy} onClick={() => void ensureShare()} className="mt-3 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">{share ? "Perbarui tautan" : "Buat tautan"}</button>
        {share && (
          <>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3"><div><p className="text-sm font-medium">Aktifkan tautan</p><p className="text-xs text-slate-500">{share.enabled ? "Tautan dapat dibuka" : "Tautan dinonaktifkan"}</p></div><button type="button" role="switch" aria-checked={share.enabled} disabled={busy} onClick={() => void toggleEnabled(!share.enabled)} className={`relative h-7 w-12 rounded-full ${share.enabled ? "bg-blue-600" : "bg-slate-300"}`}><span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${share.enabled ? "left-5" : "left-0.5"}`} /></button></div>
            {share.enabled && (
              <>
                <input readOnly value={publicUrl} onFocus={(e) => e.currentTarget.select()} className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600" />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void copy()} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-sm"><CopyIcon className="h-4 w-4" />{copied ? "Tersalin" : "Salin tautan"}</button>
                  <button type="button" onClick={() => void nativeShare()} className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white"><ShareIcon className="h-4 w-4" />Bagikan</button>
                </div>
                <button type="button" disabled={busy} onClick={() => void regenerate()} className="mt-3 w-full text-center text-xs font-medium text-slate-500 underline disabled:opacity-50">Buat ulang tautan</button>
              </>
            )}
          </>
        )}
      </section>
    </ModalShell>
  );
}

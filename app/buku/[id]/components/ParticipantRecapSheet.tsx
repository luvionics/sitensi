"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import ModalShell from "./ModalShell";
import { STATUS_LABEL, type Status } from "./status";
import { XIcon } from "./icons";
import type { Participant } from "./types";

type Props = {
  supabase: SupabaseClient;
  bookId: string;
  participant: Participant;
  onShare: () => void;
  onClose: () => void;
};

type Attendance = { tanggal: string; status: Status; catatan: string | null };
type Period = "all" | "month" | "last-month" | "range";

export default function ParticipantRecapSheet({ supabase, bookId, participant, onShare, onClose }: Props) {
  const [period, setPeriod] = useState<Period>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [month, setMonth] = useState(() => new Date());
  const [records, setRecords] = useState<Attendance[]>([]);
  const [sessionDates, setSessionDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");

  const range = useMemo(() => periodRange(period, from, to), [period, from, to]);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const participantRecords: Attendance[] = [];
      const sessions: Attendance[] = [];
      let offset = 0;
      while (true) {
        let query = supabase.from("attendance").select("tanggal,status,catatan").eq("participant_id", participant.id).eq("book_id", bookId);
        if (range.from) query = query.gte("tanggal", range.from);
        if (range.to) query = query.lte("tanggal", range.to);
        const { data, error } = await query.order("tanggal", { ascending: false }).range(offset, offset + 999);
        if (error) throw error;
        participantRecords.push(...(data ?? []).map((row) => ({ tanggal: row.tanggal, status: row.status as Status, catatan: row.catatan })));
        if (!data?.length || data.length < 1000) break;
        offset += 1000;
      }
      offset = 0;
      while (true) {
        let query = supabase.from("attendance").select("tanggal,status").eq("book_id", bookId);
        if (range.from) query = query.gte("tanggal", range.from);
        if (range.to) query = query.lte("tanggal", range.to);
        const { data, error } = await query.range(offset, offset + 999);
        if (error) throw error;
        sessions.push(...(data ?? []).map((row) => ({ tanggal: row.tanggal, status: row.status as Status, catatan: null })));
        if (!data?.length || data.length < 1000) break;
        offset += 1000;
      }
      setRecords(participantRecords);
      setSessionDates([...new Set(sessions.map((row) => row.tanggal))].sort());
    } catch (error) {
      setError(error instanceof Error ? error.message : "Rekap gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [supabase, participant.id, bookId, range.from, range.to]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const totals = records.reduce((result, record) => {
    if (record.status in result) result[record.status]++;
    return result;
  }, { hadir: 0, izin: 0, alpha: 0 });
  const unanswered = sessionDates.filter((date) => !records.some((record) => record.tanggal === date)).length;
  const denominator = totals.hadir + totals.izin + totals.alpha;
  const percentage = denominator ? Math.round(totals.hadir / denominator * 100) : 0;
  const longest = longestStreak(records);
  const filtered = records.filter((record) => statusFilter === "all" || record.status === statusFilter);
  const datesForMonth = calendarDates(month);
  const inMonthSessions = new Set(sessionDates.filter((date) => date.startsWith(monthKey(month))));
  const recordByDate = new Map(records.map((record) => [record.tanggal, record]));

  return (
    <ModalShell layer="z-[70]" onClose={onClose} labelledBy="participant-recap-title" panelClassName="overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs text-slate-500">Rekap peserta</p><h2 id="participant-recap-title" className="text-lg font-semibold">{participant.name}</h2></div>
        <button type="button" aria-label="Tutup" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"><XIcon /></button>
      </div>

      <label className="mt-4 block text-sm font-medium text-slate-700">Periode</label>
      <select value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
        <option value="all">Semua</option><option value="month">Bulan ini</option><option value="last-month">Bulan lalu</option><option value="range">Rentang tanggal</option>
      </select>
      {period === "range" && <div className="mt-2 grid grid-cols-2 gap-2"><input aria-label="Tanggal mulai" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /><input aria-label="Tanggal selesai" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /></div>}

      {loading ? <div className="mt-4 h-32 animate-pulse rounded-2xl bg-slate-100" aria-label="Memuat rekap" /> : error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void load()} className="mt-2 font-semibold underline">Coba lagi</button></div> : <>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Summary label="Hadir" value={totals.hadir} />
          <Summary label="Izin" value={totals.izin} />
          <Summary label="Alpa" value={totals.alpha} />
          <Summary label="Belum diisi" value={unanswered} />
          <Summary label="% Kehadiran" value={`${percentage}%`} />
          <Summary label="Runtun terpanjang" value={longest} />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button type="button" aria-label="Bulan sebelumnya" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">‹</button>
          <p className="text-sm font-semibold">{month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
          <button type="button" aria-label="Bulan berikutnya" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="rounded-full p-2 text-slate-500 hover:bg-slate-100">›</button>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1 text-center">
          {["M", "S", "S", "R", "K", "J", "S"].map((day, index) => <span key={index} className="text-[11px] font-medium text-slate-400">{day}</span>)}
          {datesForMonth.map((date, index) => {
            if (!date) return <span key={`empty-${index}`} />;
            const key = dateKey(date);
            const record = recordByDate.get(key);
            const isSession = inMonthSessions.has(key);
            const title = record ? `${STATUS_LABEL[record.status]}${record.catatan ? `: ${record.catatan}` : ""}` : isSession ? "Belum diisi" : "Tidak ada sesi";
            return <button key={key} type="button" title={title} aria-label={`${date.toLocaleDateString("id-ID")}: ${title}`} className={`aspect-square rounded-xl text-xs font-medium ${record ? statusColor(record.status) : isSession ? "bg-slate-200 text-slate-600" : "bg-slate-50 text-slate-300"}`}>{date.getDate()}</button>;
          })}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto">
          {(["all", "hadir", "izin", "alpha"] as const).map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${statusFilter === status ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>{status === "all" ? "Semua" : status === "alpha" ? "Alpa" : STATUS_LABEL[status]}</button>)}
        </div>
        <div className="mt-3 space-y-2">
          {filtered.length ? filtered.map((record) => (
            <article key={record.tanggal} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{formatDate(record.tanggal)}</p><span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColor(record.status)}`}>{STATUS_LABEL[record.status]}</span></div>
              {record.status === "izin" && record.catatan && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{record.catatan}</p>}
            </article>
          )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Belum ada riwayat absensi</div>}
        </div>
      </>}
      <button type="button" onClick={onShare} className="mt-5 w-full rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white">Bagikan rekap</button>
    </ModalShell>
  );
}

function Summary({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl bg-slate-50 px-2 py-3 text-center"><p className="text-lg font-semibold">{value}</p><p className="mt-0.5 text-[11px] text-slate-500">{label}</p></div>;
}

function periodRange(period: Period, from: string, to: string) {
  if (period === "range") return { from: from || null, to: to || null };
  if (period === "all") return { from: null, to: null };
  const now = new Date();
  const target = period === "month" ? now : new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = new Date(target.getFullYear(), target.getMonth(), 1);
  const end = period === "month" ? now : new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: dateKey(start), to: dateKey(end) };
}

function monthKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`; }
function dateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function calendarDates(month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(year, monthIndex, 1);
  const offset = (first.getDay() + 6) % 7;
  const count = new Date(year, monthIndex + 1, 0).getDate();
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => new Date(year, monthIndex, index + 1))];
}
function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function statusColor(status: Status) {
  return status === "hadir" ? "bg-emerald-100 text-emerald-700" : status === "izin" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
}
function longestStreak(records: Attendance[]) {
  const dates = new Set(records.filter((record) => record.status === "hadir").map((record) => record.tanggal));
  let longest = 0;
  let current = 0;
  let previous: number | null = null;
  [...dates].sort().forEach((value) => {
    const day = new Date(`${value}T00:00:00`).getTime();
    current = previous !== null && day - previous === 86400000 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  });
  return longest;
}

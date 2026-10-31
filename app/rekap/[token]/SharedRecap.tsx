"use client";

import { useEffect, useState } from "react";

type AttendanceRecord = { tanggal: string; status: "hadir" | "izin" | "alpha"; catatan: string | null };
type Participant = {
  name: string;
  hadir: number;
  izin: number;
  alpha: number;
  history?: AttendanceRecord[];
  records?: AttendanceRecord[];
};
type Recap = {
  book_name: string;
  scope: "book" | "participant";
  participant_name?: string;
  date_from: string | null;
  date_to: string | null;
  totals?: { hadir: number; izin: number; alpha: number };
  participants?: Participant[];
  history?: AttendanceRecord[];
  session_dates?: string[];
} | null;

export default function SharedRecap({ recap }: { recap: Recap }) {
  const [selected, setSelected] = useState<Participant | null>(null);
  const [search, setSearch] = useState("");
  const filteredParticipants = recap?.participants?.filter((participant) =>
    participant.name.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID"))
  ) ?? [];

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selected]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-md">
        {!recap ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
            <h1 className="text-lg font-semibold">Tautan tidak ditemukan atau sudah dinonaktifkan</h1>
            <p className="mt-2 text-sm text-slate-500">Periksa kembali tautan rekap yang Anda terima.</p>
          </div>
        ) : (
          <>
            <header>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rekap absensi</p>
              <h1 className="mt-1 text-2xl font-bold">{recap.book_name}</h1>
              {recap.scope === "participant" && <p className="mt-1 text-sm font-medium text-blue-600">{recap.participant_name}</p>}
              <p className="mt-2 text-sm text-slate-500">{periodLabel(recap.date_from, recap.date_to)}</p>
            </header>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <SummaryCard label="Hadir" value={recap.totals?.hadir ?? 0} status="hadir" />
              <SummaryCard label="Izin" value={recap.totals?.izin ?? 0} status="izin" />
              <SummaryCard label="Alpa" value={recap.totals?.alpha ?? 0} status="alpha" />
            </div>

            <section className="mt-5 space-y-2">
              {recap.scope === "book" ? (
                <>
                  <div className="relative mb-3">
                    <span aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari peserta..."
                      aria-label="Cari peserta"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                  {filteredParticipants.length ? filteredParticipants.map((participant, index) => (
                  <button
                    key={`${participant.name}-${index}`}
                    type="button"
                    onClick={() => setSelected(participant)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-200 hover:shadow-sm"
                    aria-label={`Lihat detail rekap ${participant.name}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{participant.name}</p>
                      <span aria-hidden="true" className="text-slate-400">›</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <CountBadge label="Hadir" value={participant.hadir} status="hadir" />
                      <CountBadge label="Izin" value={participant.izin} status="izin" />
                      <CountBadge label="Alpa" value={participant.alpha} status="alpha" />
                    </div>
                  </button>
                  )) : <Empty message={search.trim() ? "Peserta tidak ditemukan." : undefined} />}
                </>
              ) : (
                recap.history?.length ? recap.history.map((item, index) => (
                  <div key={`${item.tanggal}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">{formatDate(item.tanggal)}</p><Status status={item.status} /></div>
                    {item.catatan && <p className="mt-2 text-sm text-slate-500">{item.catatan}</p>}
                  </div>
                )) : <Empty />
              )}
            </section>
          </>
        )}
        <footer className="mt-8 text-center text-xs text-slate-400">Sitensi - Absensi digital yang mudah</footer>
      </div>

      {selected && recap?.scope === "book" && (
        <ParticipantDetail participant={selected} sessionDates={recap.session_dates ?? []} onClose={() => setSelected(null)} />
      )}
    </main>
  );
}

function ParticipantDetail({ participant, sessionDates, onClose }: { participant: Participant; sessionDates: string[]; onClose: () => void }) {
  const [month, setMonth] = useState(() => new Date());
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceRecord["status"]>("all");
  const records = participant.history ?? participant.records ?? [];
  const denominator = records.length;
  const percentage = denominator ? Math.round(participant.hadir / denominator * 100) : 0;
  const unanswered = sessionDates.filter((date) => !records.some((record) => record.tanggal === date)).length;
  const filtered = records.filter((record) => statusFilter === "all" || record.status === statusFilter);
  const datesForMonth = calendarDates(month);
  const inMonthSessions = new Set(sessionDates.filter((date) => date.startsWith(monthKey(month))));
  const recordByDate = new Map(records.map((record) => [record.tanggal, record]));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" role="presentation" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="participant-detail-title" onMouseDown={(event) => event.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shadow-xl sm:rounded-3xl sm:p-6">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs text-slate-500">Rekap peserta</p><h2 id="participant-detail-title" className="text-lg font-semibold">{participant.name}</h2></div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">✕</button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <DetailSummary label="Hadir" value={participant.hadir} status="hadir" />
          <DetailSummary label="Izin" value={participant.izin} status="izin" />
          <DetailSummary label="Alpa" value={participant.alpha} status="alpha" />
          <DetailSummary label="Belum diisi" value={unanswered} />
          <DetailSummary label="% Kehadiran" value={`${percentage}%`} />
          <DetailSummary label="Runtun terpanjang" value={longestStreak(records)} />
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
            const title = record ? `${statusLabel(record.status)}${record.catatan ? `: ${record.catatan}` : ""}` : isSession ? "Belum diisi" : "Tidak ada sesi";
            return <button key={key} type="button" title={title} aria-label={`${date.toLocaleDateString("id-ID")}: ${title}`} className={`aspect-square rounded-xl text-xs font-medium ${record ? statusColor(record.status) : isSession ? "bg-slate-200 text-slate-600" : "bg-slate-50 text-slate-300"}`}>{date.getDate()}</button>;
          })}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto">
          {(["all", "hadir", "izin", "alpha"] as const).map((status) => (
            <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${statusFilter === status ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {status === "all" ? "Semua" : statusLabel(status)}
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {filtered.length ? filtered.map((record) => (
            <article key={record.tanggal} className="rounded-2xl border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3"><p className="text-sm font-medium">{formatDate(record.tanggal)}</p><Status status={record.status} /></div>
              {record.status === "izin" && record.catatan && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-600">{record.catatan}</p>}
            </article>
          )) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">Belum ada riwayat absensi</div>}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, status }: { label: string; value: number; status: AttendanceRecord["status"] }) {
  return <div className="flex flex-col items-center rounded-3xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-100"><div className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold ${statusTotalColor(status)}`}><p>{value}</p></div><p className="mt-2 text-xs font-medium text-slate-600">{label}</p></div>;
}

function CountBadge({ label, value, status }: { label: string; value: number; status: AttendanceRecord["status"] }) {
  return <div className="flex items-center justify-center gap-1.5 rounded-full bg-slate-50 px-2 py-1.5"><span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1.5 text-xs font-bold ${statusTotalColor(status)}`}>{value}</span><span className="text-[11px] font-medium text-slate-600">{label}</span></div>;
}

function DetailSummary({ label, value, status }: { label: string; value: number | string; status?: AttendanceRecord["status"] }) {
  if (status) return <CountBadge label={label} value={typeof value === "number" ? value : 0} status={status} />;
  return <div className="rounded-2xl bg-slate-50 px-2 py-3 text-center"><p className="text-lg font-semibold">{value}</p><p className="mt-0.5 text-[11px] text-slate-500">{label}</p></div>;
}

function Status({ status }: { status: "hadir" | "izin" | "alpha" }) {
  const color = status === "hadir" ? "bg-emerald-100 text-emerald-700" : status === "izin" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium ${color}`}>{status === "alpha" ? "Alpa" : status[0].toUpperCase() + status.slice(1)}</span>;
}

function Empty({ message }: { message?: string } = {}) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{message ?? "Belum ada data pada periode ini."}</div>;
}

function periodLabel(from: string | null, to: string | null) {
  if (!from && !to) return "Semua periode";
  return `${from ?? "Awal"} s/d ${to ?? "Sekarang"}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
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
function statusLabel(status: AttendanceRecord["status"]) {
  return status === "hadir" ? "Hadir" : status === "izin" ? "Izin" : "Alpa";
}
function statusColor(status: AttendanceRecord["status"]) {
  return status === "hadir" ? "bg-emerald-100 text-emerald-700" : status === "izin" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
}
function statusTotalColor(status: AttendanceRecord["status"]) {
  return status === "hadir" ? "bg-emerald-100 text-emerald-700" : status === "izin" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
}
function longestStreak(records: AttendanceRecord[]) {
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

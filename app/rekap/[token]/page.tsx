import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const instant = false;

type Recap = {
  book_name: string;
  scope: "book" | "participant";
  participant_name?: string;
  date_from: string | null;
  date_to: string | null;
  totals?: { hadir: number; izin: number; alpha: number };
  participants?: { name: string; hadir: number; izin: number; alpha: number }[];
  history?: { tanggal: string; status: "hadir" | "izin" | "alpha"; catatan: string | null }[];
};

export default async function RekapPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_recap", { p_token: token });
  const recap = !error && data ? data as Recap : null;

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
              <SummaryCard label="Hadir" value={recap.totals?.hadir ?? 0} color="bg-emerald-50 text-emerald-700" />
              <SummaryCard label="Izin" value={recap.totals?.izin ?? 0} color="bg-amber-50 text-amber-700" />
              <SummaryCard label="Alpa" value={recap.totals?.alpha ?? 0} color="bg-red-50 text-red-700" />
            </div>

            <section className="mt-5 space-y-2">
              {recap.scope === "book" ? (
                recap.participants?.length ? recap.participants.map((participant, index) => (
                  <div key={`${participant.name}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold">{participant.name}</p>
                    <div className="mt-2 grid grid-cols-3 text-sm text-slate-600"><span>Hadir {participant.hadir}</span><span>Izin {participant.izin}</span><span>Alpa {participant.alpha}</span></div>
                  </div>
                )) : <Empty />
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
    </main>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return <div className={`rounded-2xl p-3 text-center ${color}`}><p className="text-2xl font-bold">{value}</p><p className="text-xs">{label}</p></div>;
}

function Status({ status }: { status: "hadir" | "izin" | "alpha" }) {
  const color = status === "hadir" ? "bg-emerald-100 text-emerald-700" : status === "izin" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${color}`}>{status}</span>;
}

function Empty() {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Belum ada data absensi pada periode ini.</div>;
}

function periodLabel(from: string | null, to: string | null) {
  if (!from && !to) return "Semua periode";
  return `${from ?? "Awal"} s/d ${to ?? "Sekarang"}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

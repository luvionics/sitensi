"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import ModalShell from "./ModalShell";
import { XIcon } from "./icons";
import { displayHeaders, safeSpreadsheetValue, type ParticipantField } from "./spreadsheet";

type Props = {
  supabase: SupabaseClient;
  bookId: string;
  bookName: string;
  onNotice: (message: string, error?: boolean) => void;
  onClose: () => void;
};

export default function ParticipantExportModal({ supabase, bookId, bookName, onNotice, onClose }: Props) {
  const [fields, setFields] = useState<ParticipantField[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [includeEmail, setIncludeEmail] = useState(true);
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [period, setPeriod] = useState<"all" | "month" | "range">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    void supabase.from("participant_fields").select("id, key, label, sort_order").eq("book_id", bookId).order("sort_order")
      .then(({ data }) => {
        const latest = (data ?? []) as ParticipantField[];
        setFields(latest);
        setSelected(latest.map((field) => field.key));
      });
  }, [bookId, supabase]);

  async function exportExcel() {
    setBusy(true);
    try {
      const { data: latestFields, error: fieldsError } = await supabase.from("participant_fields").select("id, key, label, sort_order").eq("book_id", bookId).order("sort_order");
      if (fieldsError) throw fieldsError;
      const latest = (latestFields ?? []) as ParticipantField[];
      const usedFields = latest.filter((field) => selected.includes(field.key));
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Peserta");
      const headers = ["Nama", ...(includeEmail ? ["Email"] : []), ...displayHeaders(usedFields), "Hadir", "Izin", "Alpa"];
      sheet.addRow(headers);
      sheet.columns.forEach((column) => { column.numFmt = "@"; });
      const periodRange = exportPeriod(period, dateFrom, dateTo);

      const pageSize = 1000;
      let offset = 0;
      while (true) {
        const { data: participants, error } = await supabase.from("participants").select("id, name, email, data").eq("book_id", bookId).order("sort_order").range(offset, offset + pageSize - 1);
        if (error) throw error;
        if (!participants?.length) break;
        for (const participant of participants) {
          const counts = { hadir: 0, izin: 0, alpha: 0 };
          let attendanceOffset = 0;
          while (true) {
            let query = supabase.from("attendance").select("status").eq("book_id", bookId).eq("participant_id", participant.id);
            if (periodRange.from) query = query.gte("tanggal", periodRange.from);
            if (periodRange.to) query = query.lte("tanggal", periodRange.to);
            const { data: records, error: attendanceError } = await query.range(attendanceOffset, attendanceOffset + pageSize - 1);
            if (attendanceError) throw attendanceError;
            if (!records?.length) break;
            records.forEach((record) => { if (record.status in counts) counts[record.status as keyof typeof counts]++; });
            if (records.length < pageSize) break;
            attendanceOffset += pageSize;
          }
          const values: unknown[] = [participant.name, ...(includeEmail ? [participant.email ?? ""] : [])];
          const custom = participant.data && typeof participant.data === "object" ? participant.data as Record<string, unknown> : {};
          usedFields.forEach((field) => values.push(safeSpreadsheetValue(custom[field.key])));
          values.push(counts.hadir, counts.izin, counts.alpha);
          sheet.addRow(values.map(safeSpreadsheetValue));
        }
        if (participants.length < pageSize) break;
        offset += pageSize;
      }
      const safeName = bookName.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "") || "rekap-absensi";
      if (format === "xlsx") {
        const buffer = await workbook.xlsx.writeBuffer();
        download(buffer, `${safeName}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      } else {
        const rows = [headers, ...(sheet.getRows(2, sheet.rowCount - 1) ?? []).map((row) => headers.map((_, column) => row.getCell(column + 1).value ?? ""))];
        downloadCsv(rows, `${safeName}.csv`);
      }
      onNotice("Rekap peserta berhasil diekspor.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Ekspor gagal.", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} labelledBy="export-title" panelClassName="overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <h2 id="export-title" className="text-lg font-semibold">Ekspor rekap absensi</h2>
        <button type="button" aria-label="Tutup" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><XIcon /></button>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={includeEmail} onChange={(event) => setIncludeEmail(event.target.checked)} />Sertakan email</label>
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Kolom data yang disertakan</legend>
        <div className="mt-2 max-h-48 space-y-2 overflow-y-auto">
          {fields.map((field) => (
            <label key={field.key} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selected.includes(field.key)} onChange={(event) => setSelected((list) => event.target.checked ? [...list, field.key] : list.filter((key) => key !== field.key))} />
              {field.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 block text-sm font-medium">Periode</label>
      <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
        <option value="all">Semua</option><option value="month">Bulan ini</option><option value="range">Rentang tanggal</option>
      </select>
      {period === "range" && <div className="mt-2 grid grid-cols-2 gap-2"><input aria-label="Tanggal mulai" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /><input aria-label="Tanggal selesai" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="rounded-xl border border-slate-200 px-2 py-2 text-sm" /></div>}
      <div className="mt-4 flex gap-2 rounded-xl bg-slate-100 p-1"><button type="button" onClick={() => setFormat("xlsx")} className={`flex-1 rounded-lg py-2 text-sm ${format === "xlsx" ? "bg-white shadow" : ""}`}>Excel</button><button type="button" onClick={() => setFormat("csv")} className={`flex-1 rounded-lg py-2 text-sm ${format === "csv" ? "bg-white shadow" : ""}`}>CSV</button></div>
      <button type="button" disabled={busy || (period === "range" && (!dateFrom || !dateTo))} onClick={() => void exportExcel()} className="mt-5 w-full rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white disabled:opacity-50">{busy ? "Mengekspor..." : `Unduh ${format === "xlsx" ? "Excel" : "CSV"}`}</button>
    </ModalShell>
  );
}

function download(buffer: ArrayBuffer | BlobPart, filename: string, type: string) {
  const blob = new Blob([buffer], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

function downloadCsv(rows: unknown[][], filename: string) {
  const csv = rows.map((row) => row.map((value) => {
    const text = String(value ?? "").replace(/"/g, '""');
    return `"${text}"`;
  }).join(",")).join("\r\n");
  download("\uFEFF" + csv, filename, "text/csv;charset=utf-8");
}

function exportPeriod(period: "all" | "month" | "range", from: string, to: string) {
  if (period === "range") return { from, to };
  if (period === "all") return { from: null, to: null };
  const now = new Date();
  return {
    from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
    to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`,
  };
}

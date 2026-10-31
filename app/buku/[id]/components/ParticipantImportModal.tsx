"use client";

import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import ModalShell from "./ModalShell";
import { XIcon } from "./icons";
import { cellText, displayHeaders, normalizeHeader, slugKey, uniqueKey, type ParticipantField } from "./spreadsheet";

type Props = {
  supabase: SupabaseClient;
  bookId: string;
  bookName: string;
  onImported: () => void;
  onNotice: (message: string, error?: boolean) => void;
  onClose: () => void;
};

type UnknownColumn = { source: string; key: string; selected: boolean };

export default function ParticipantImportModal({ supabase, bookId, bookName, onImported, onNotice, onClose }: Props) {
  const [rows, setRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [unknown, setUnknown] = useState<UnknownColumn[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function loadFields() {
    const { data, error } = await supabase.from("participant_fields").select("id, key, label, sort_order").eq("book_id", bookId).order("sort_order");
    if (error) throw error;
    const next = (data ?? []) as ParticipantField[];
    return next;
  }

  async function downloadTemplate() {
    const latest = await loadFields();
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Peserta");
    sheet.addRow(["Nama *", "Email", ...displayHeaders(latest)]);
    sheet.getRow(1).font = { bold: true };
    sheet.columns.forEach((column) => { column.numFmt = "@"; });
    const guide = workbook.addWorksheet("Petunjuk");
    guide.addRow(["Petunjuk"]);
    guide.addRow(["Template ini mengikuti kolom data yang ada saat template diunduh."]);
    guide.addRow(["Jika kolom diubah sesudahnya, unduh template baru."]);
    guide.addRow(["Kode status tidak digunakan pada impor peserta."]);
    const buffer = await workbook.xlsx.writeBuffer();
    const safeName = bookName.replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "") || "peserta";
    download(buffer, `template-${safeName}.xlsx`);
    onNotice("Template peserta berhasil diunduh.");
  }

  async function readFile(file: File) {
    setBusy(true);
    setMessage("");
    try {
      const latest = await loadFields();
      let matrix: string[][];
      if (file.name.toLowerCase().endsWith(".csv")) {
        matrix = parseCsv(await file.text());
      } else {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(await file.arrayBuffer());
        matrix = workbook.worksheets[0]?.getSheetValues().slice(1).map((row) =>
          (Array.isArray(row) ? row.slice(1) : []).map(cellText)
        ) ?? [];
      }
      setRows(matrix.slice(1));
      const headers = (matrix[0] ?? []).map((header) => String(header));
      setHeaders(headers);
      const known = new Map<string, ParticipantField>();
      latest.forEach((field) => {
        known.set(normalizeHeader(field.key), field);
        known.set(normalizeHeader(field.label), field);
      });
      known.set(normalizeHeader("Nama *"), { id: "", key: "name", label: "Nama", sort_order: -2 });
      known.set("nama", known.get("nama") ?? { id: "", key: "name", label: "Nama", sort_order: -2 });
      known.set("email", { id: "", key: "email", label: "Email", sort_order: -1 });
      const newUnknown: UnknownColumn[] = [];
      const usedKeys = new Set(latest.map((field) => field.key));
      headers.forEach((header) => {
        const normalized = normalizeHeader(header);
        if (known.has(normalized) || normalized === "nama") return;
        if (!normalized) return;
        const label = header.replace(/[.\s]+$/g, "").trim() || header;
        newUnknown.push({ source: header, key: uniqueKey(slugKey(label), usedKeys), selected: false });
        usedKeys.add(newUnknown[newUnknown.length - 1].key);
      });
      setUnknown(newUnknown.filter((item, index, list) => list.findIndex((other) => normalizeHeader(other.source) === normalizeHeader(item.source)) === index));
      setMessage(`${matrix.length ? matrix.length - 1 : 0} baris siap ditinjau.`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "File gagal dibaca.", true);
    } finally {
      setBusy(false);
    }
  }

  async function importRows() {
    if (!rows.length || busy) return;
    setBusy(true);
    try {
      let latest = await loadFields();
      for (const column of unknown.filter((item) => item.selected)) {
        const maxOrder = latest.reduce((max, field) => Math.max(max, field.sort_order), -1);
        const { data, error } = await supabase.from("participant_fields").insert({
          book_id: bookId, key: column.key, label: column.source.replace(/[.\s]+$/g, "").trim(), sort_order: maxOrder + 1,
        }).select("id, key, label, sort_order").single();
        if (error) throw error;
        latest = [...latest, data as ParticipantField].sort((a, b) => a.sort_order - b.sort_order);
      }

      const { data: existing } = await supabase.from("participants").select("email").eq("book_id", bookId);
      const knownEmails = new Set((existing ?? []).map((row) => String(row.email ?? "").trim().toLowerCase()).filter(Boolean));
      let skipped = 0;
      let inserted = 0;
      const { data: maxRow } = await supabase.from("participants").select("sort_order").eq("book_id", bookId).order("sort_order", { ascending: false }).limit(1).maybeSingle();
      let sortOrder = Number(maxRow?.sort_order ?? -1) + 1;

      for (const row of rows) {
        const knownHeaders = headers.map(normalizeHeader);
        const name = cellText(row[knownHeaders.indexOf("nama")] ?? row[knownHeaders.indexOf("nama*")] ?? "");
        const emailIndex = knownHeaders.indexOf("email");
        const email = emailIndex >= 0 ? cellText(row[emailIndex]).trim().toLowerCase() : "";
        if (!name.trim() || email && knownEmails.has(email)) { skipped++; continue; }
        const data: Record<string, string> = {};
        latest.forEach((field) => {
          const index = headers.findIndex((header) => normalizeHeader(header) === normalizeHeader(field.key) || normalizeHeader(header) === normalizeHeader(field.label));
          const value = index >= 0 ? cellText(row[index]).trim() : "";
          if (value) data[field.key] = value;
        });
        const { error } = await supabase.from("participants").insert({ book_id: bookId, name: name.trim(), email: email || null, data, sort_order: sortOrder++ });
        if (error?.message.includes("belum terdaftar")) {
          latest = await loadFields();
          setMessage("Kolom berubah saat impor. Muat ulang file dan coba lagi.");
          setBusy(false);
          return;
        }
        if (error) throw error;
        if (email) knownEmails.add(email);
        inserted++;
      }
      setMessage(`${inserted} peserta ditambahkan, ${skipped} dilewati.`);
      onNotice(`${inserted} peserta berhasil diimpor.`);
      onImported();
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Impor gagal.", true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell onClose={onClose} labelledBy="import-title" panelClassName="overflow-y-auto">
      <div className="flex items-start justify-between gap-3">
        <h2 id="import-title" className="text-lg font-semibold">Impor peserta</h2>
        <button type="button" aria-label="Tutup" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100"><XIcon /></button>
      </div>
      <button type="button" onClick={() => void downloadTemplate()} className="mt-4 w-full rounded-2xl border border-blue-200 bg-blue-50 py-2.5 text-sm font-medium text-blue-700">Unduh template Excel</button>
      <input aria-label="Pilih file impor" type="file" accept=".xlsx,.csv,text/csv" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; void readFile(file); }} className="mt-3 w-full text-sm" />
      {unknown.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-semibold text-amber-800">Kolom tidak dikenal</p>
          {unknown.map((column, index) => (
            <label key={column.source} className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={column.selected} onChange={(event) => setUnknown((list) => list.map((item, i) => i === index ? { ...item, selected: event.target.checked } : item))} />{column.source}</label>
          ))}
        </div>
      )}
      {message && <p className="mt-3 text-sm text-slate-500">{message}</p>}
      {rows.length > 0 && <button type="button" disabled={busy} onClick={() => void importRows()} className="mt-4 w-full rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white disabled:opacity-50">{busy ? "Mengimpor..." : "Impor peserta"}</button>}
    </ModalShell>
  );
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(value); rows.push(row); row = []; value = "";
    } else value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows.filter((item) => item.some(Boolean));
}

function download(buffer: ArrayBuffer | BlobPart, filename: string) {
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  URL.revokeObjectURL(url);
}

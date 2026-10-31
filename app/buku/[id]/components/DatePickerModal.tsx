import type { RefObject } from "react";
import ModalShell from "./ModalShell";
import { ChevronLeft, ChevronRight, FolderIcon } from "./icons";

// Helper tampilan khusus modal ini
const monthName = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long" });
};

const parseDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const fmtWeekday = (s: string) => parseDate(s).toLocaleDateString("id-ID", { weekday: "long" });

const fmtLongDate = (s: string) =>
  parseDate(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

type Props = {
  date: string;
  today: string;
  selectedMonth: string;
  pickerMonth: string | null;
  monthList: string[];
  monthDays: Record<string, number>;
  dayList: string[];
  dateCounts: Record<string, number> | null;
  /** Batas tanggal maksimum untuk input tanggal; undefined bila tanggal mendatang diizinkan */
  maxDate?: string;
  listRef: RefObject<HTMLDivElement | null>;
  onSelectMonth: (monthKey: string) => void;
  onBackToMonths: () => void;
  onPickDate: (date: string) => void;
  onPickToday: () => void;
  onClose: () => void;
};

export default function DatePickerModal({
  date,
  today,
  selectedMonth,
  pickerMonth,
  monthList,
  monthDays,
  dayList,
  dateCounts,
  maxDate,
  listRef,
  onSelectMonth,
  onBackToMonths,
  onPickDate,
  onPickToday,
  onClose,
}: Props) {
  return (
    <ModalShell onClose={onClose} labelledBy="date-title">
      {pickerMonth ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToMonths}
            aria-label="Kembali ke daftar bulan"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <ChevronLeft />
          </button>
          <h2 id="date-title" className="min-w-0 flex-1 truncate text-lg font-semibold">
            {monthName(pickerMonth)} {pickerMonth.slice(0, 4)}
          </h2>
        </div>
      ) : (
        <div>
          <h2 id="date-title" className="text-lg font-semibold">
            Pilih tanggal
          </h2>
          <p className="mt-1 text-sm text-slate-500">Buka folder bulan, lalu pilih harinya.</p>
        </div>
      )}

      <div
        ref={listRef}
        className="mt-4 min-h-[10rem] flex-1 overflow-y-auto rounded-2xl border border-slate-200"
      >
        {!pickerMonth ? (
          dateCounts === null ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <ul>
              {monthList.map((mk, i) => {
                const year = mk.slice(0, 4);
                const showYear = i === 0 || monthList[i - 1].slice(0, 4) !== year;
                const days = monthDays[mk] ?? 0;
                const isSelected = mk === selectedMonth;
                return (
                  <li key={mk}>
                    {showYear && (
                      <p className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {year}
                      </p>
                    )}
                    <button
                      type="button"
                      data-selected={isSelected}
                      onClick={() => onSelectMonth(mk)}
                      className={`flex w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 ${
                        isSelected ? "bg-blue-50/60" : ""
                      }`}
                    >
                      <FolderIcon className="h-6 w-6 shrink-0 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize text-slate-800">
                          {monthName(mk)}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {days > 0 ? `${days} hari tercatat` : "Belum ada catatan"}
                        </p>
                      </div>
                      {isSelected && (
                        <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Dibuka
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <ul>
            {dayList.map((s) => {
              const isSelected = s === date;
              const isToday = s === today;
              const count = dateCounts?.[s] ?? 0;
              return (
                <li key={s}>
                  <button
                    type="button"
                    data-selected={isSelected}
                    onClick={() => onPickDate(s)}
                    className={`flex w-full cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-left focus:outline-none focus-visible:bg-slate-50 ${
                      isSelected ? "bg-blue-50 hover:bg-blue-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-semibold ${
                        isSelected
                          ? "bg-blue-600 text-white"
                          : isToday
                          ? "bg-blue-50 text-blue-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {Number(s.slice(8, 10))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {fmtWeekday(s)}
                        {isToday && (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Hari ini
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">{fmtLongDate(s)}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs ${
                        count > 0 ? "font-medium text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {count > 0 ? `${count} tercatat` : "Kosong"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="jump-date" className="block text-xs font-medium text-slate-500">
          Atau lompat langsung ke tanggal
        </label>
        <input
          id="jump-date"
          type="date"
          max={maxDate}
          value={date}
          onChange={(e) => e.target.value && onPickDate(e.target.value)}
          className="mt-1.5 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onPickToday}
          className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Hari ini
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Tutup
        </button>
      </div>
    </ModalShell>
  );
}
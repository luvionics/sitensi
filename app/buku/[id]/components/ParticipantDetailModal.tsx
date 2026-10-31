"use client";

import { useState } from "react";
import type { Field, Participant } from "./types";
import ModalShell from "./ModalShell";
import { CheckIcon, PencilIcon, XIcon } from "./icons";

type Props = {
  participant: Participant;
  fields: Field[];
  busy: boolean;
  onSave: (patch: { name?: string; email?: string | null; dataKey?: string; dataValue?: string }) => Promise<boolean>;
  onClose: () => void;
};

export default function ParticipantDetailModal({ participant, fields, busy, onSave, onClose }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const rows = [
    { id: "name", label: "Nama", value: participant.name, type: "text" },
    { id: "email", label: "Email", value: participant.email ?? "", type: "email" },
    ...fields.map((field) => ({
      id: field.key,
      label: field.label,
      value: participant.data[field.key] ?? "",
      type: "text",
    })),
  ];

  function startEditing(id: string, value: string) {
    setEditing(id);
    setDraft(value);
  }

  function cancelEditing() {
    setEditing(null);
    setDraft("");
  }

  async function saveEditing() {
    if (!editing || busy) return;
    if (editing === "name" && !draft.trim()) return;

    let saved = false;
    if (editing === "name") saved = await onSave({ name: draft });
    else if (editing === "email") saved = await onSave({ email: draft });
    else saved = await onSave({ dataKey: editing, dataValue: draft });

    if (saved) cancelEditing();
  }

  return (
    <ModalShell
      layer="z-[60]"
      onClose={onClose}
      labelledBy="participant-detail-title"
      panelClassName="max-h-[85vh] overflow-y-auto"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="participant-detail-title" className="text-lg font-semibold">
          Data lengkap peserta
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <XIcon />
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`flex items-start gap-2 px-3 py-3 ${index ? "border-t border-slate-200" : ""}`}
          >
            {editing === row.id ? (
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="min-w-0 flex-1">
                  <label className="block text-xs text-slate-500">{row.label}</label>
                  <input
                    autoFocus
                    type={row.type === "email" ? "email" : "text"}
                    value={draft}
                    disabled={busy}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void saveEditing();
                      } else if (e.key === "Escape") {
                        e.stopPropagation();
                        cancelEditing();
                      }
                    }}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1 pt-5">
                  <button
                    type="button"
                    aria-label={`Simpan ${row.label}`}
                    disabled={busy || (editing === "name" && !draft.trim())}
                    onClick={() => void saveEditing()}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Batal edit ${row.label}`}
                    disabled={busy}
                    onClick={cancelEditing}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">{row.label}</p>
                  <p className={`mt-0.5 text-sm break-words ${row.value ? "text-slate-800" : "text-slate-400"}`}>
                    {row.value || "-"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  aria-label={`Edit ${row.label}`}
                  onClick={() => startEditing(row.id, row.value)}
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

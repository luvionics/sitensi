import type { FormEvent } from "react";
import type { Field } from "./types";
import ModalShell from "./ModalShell";

type Props = {
  title: string;
  submitLabel: string;
  busyLabel?: string;
  name: string;
  email: string;
  fields: Field[];
  data: Record<string, string>;
  busy: boolean;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onDataChange: (key: string, value: string) => void;
  onSubmit: (e: FormEvent) => void;
  onClose: () => void;
};

export default function ParticipantFormModal({
  title,
  submitLabel,
  busyLabel = "Menyimpan...",
  name,
  email,
  fields,
  data,
  busy,
  onNameChange,
  onEmailChange,
  onDataChange,
  onSubmit,
  onClose,
}: Props) {
  return (
    <ModalShell onClose={onClose} labelledBy="participant-form-title">
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <h2 id="participant-form-title" className="text-lg font-semibold">
          {title}
        </h2>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto px-0.5 pb-1">
          <div>
            <label htmlFor="p-name" className="block text-sm font-medium text-slate-700">
              Nama
            </label>
            <input
              id="p-name"
              autoFocus
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Nama lengkap"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label htmlFor="p-email" className="block text-sm font-medium text-slate-700">
              Email <span className="font-normal text-slate-400">(opsional)</span>
            </label>
            <input
              id="p-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="nama@contoh.com"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {fields.map((f) => (
            <div key={f.id}>
              <label htmlFor={`pf-${f.id}`} className="block text-sm font-medium text-slate-700">
                {f.label}
              </label>
              <input
                id={`pf-${f.id}`}
                value={data[f.key] ?? ""}
                onChange={(e) => onDataChange(f.key, e.target.value)}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {busy ? busyLabel : submitLabel}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
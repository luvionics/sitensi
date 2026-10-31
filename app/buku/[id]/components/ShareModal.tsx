"use client";

import { useState } from "react";

type Props = {
  enabled: boolean;
  url: string;
  busy: boolean;
  onToggle: (next: boolean) => void;
  onRegenerate: () => void;
  onClose: () => void;
};

export default function ShareModal({ enabled, url, busy, onToggle, onRegenerate, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard tidak tersedia */
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Daftar peserta", url });
      } catch {
        /* dibatalkan */
      }
    } else {
      copy();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Bagikan buku absen</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Peserta mendaftar sendiri lewat tautan, tanpa perlu akun.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup" className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 p-3">
          <div>
            <p className="text-sm font-medium">Terima pendaftaran</p>
            <p className="text-xs text-slate-500">{enabled ? "Tautan aktif" : "Tautan nonaktif"}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={busy}
            onClick={() => onToggle(!enabled)}
            className={`relative h-7 w-12 rounded-full transition disabled:opacity-50 ${enabled ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span
              className={`absolute top-0.5 h-6 w-6 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`}
            />
          </button>
        </div>

        {enabled && (
          <div className="mt-3 space-y-3">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600"
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                className="rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {copied ? "Tersalin ✓" : "Salin tautan"}
              </button>
              <button
                type="button"
                onClick={nativeShare}
                className="rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Bagikan
              </button>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={onRegenerate}
              className="w-full text-center text-xs text-slate-500 underline disabled:opacity-50"
            >
              Buat tautan baru (tautan lama tidak berlaku lagi)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type FormDef = { book_name: string; fields: { key: string; label: string }[] };
type State = "loading" | "closed" | "form" | "done";

export default function DaftarPage() {
  const supabase = useMemo(() => createClient(), []);
  const { token } = useParams<{ token: string }>();

  const [state, setState] = useState<State>("loading");
  const [def, setDef] = useState<FormDef | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [data, setData] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_signup_form", { p_token: token });
      if (error || !data) return setState("closed");
      setDef(data as FormDef);
      setState("form");
    })();
  }, [supabase, token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setErr(null);

    const { data: res, error } = await supabase.rpc("register_via_link", {
      p_token: token,
      p_name: name,
      p_email: email,
      p_data: data,
    });

    if (error) setErr("Terjadi kesalahan. Coba lagi.");
    else if (res === "ok") setState("done");
    else if (res === "duplicate_email") setErr("Email itu sudah terdaftar di buku ini.");
    else if (res === "closed") setState("closed");
    else setErr("Nama wajib diisi.");

    setBusy(false);
  }

  const input =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6">
        {state === "loading" && <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />}

        {state === "closed" && (
          <div className="text-center">
            <h1 className="text-base font-semibold">Pendaftaran ditutup</h1>
            <p className="mt-1 text-sm text-slate-500">Tautan ini tidak aktif atau sudah tidak berlaku.</p>
          </div>
        )}

        {state === "done" && (
          <div className="text-center">
            <h1 className="text-base font-semibold">Terima kasih!</h1>
            <p className="mt-1 text-sm text-slate-500">
              Data Anda sudah masuk ke <b>{def?.book_name}</b>.
            </p>
          </div>
        )}

        {state === "form" && def && (
          <form onSubmit={submit} className="space-y-3">
            <div>
              <p className="text-xs text-slate-500">Pendaftaran peserta</p>
              <h1 className="text-lg font-semibold">{def.book_name}</h1>
            </div>
            <input className={input} placeholder="Nama lengkap *" value={name}
              onChange={(e) => setName(e.target.value)} maxLength={120} required />
            <input className={input} type="email" placeholder="Email (opsional)" value={email}
              onChange={(e) => setEmail(e.target.value)} maxLength={200} />
            {def.fields.map((f) => (
              <input key={f.key} className={input} placeholder={f.label} value={data[f.key] ?? ""}
                onChange={(e) => setData((d) => ({ ...d, [f.key]: e.target.value }))} maxLength={200} />
            ))}
            {err && <p className="text-sm text-red-600">{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              {busy ? "Mengirim..." : "Daftar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
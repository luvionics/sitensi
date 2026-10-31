import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

function cleanEmails(values: unknown): string[] | null {
  if (!Array.isArray(values)) return null;
  const emails: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const email = value.trim().toLowerCase();
    if (!emailPattern.test(email)) continue;
    if (!seen.has(email)) {
      seen.add(email);
      emails.push(email);
    }
  }
  return emails.length <= 20 ? emails : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });

  const now = Date.now();
  const rate = requestCounts.get(user.id);
  if (rate && rate.resetAt > now && rate.count >= 5) {
    return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429 });
  }
  if (!rate || rate.resetAt <= now) requestCounts.set(user.id, { count: 1, resetAt: now + 60_000 });
  else requestCounts.set(user.id, { count: rate.count + 1, resetAt: rate.resetAt });

  let body: { bookId?: unknown; participantId?: unknown; emails?: unknown; dateFrom?: unknown; dateTo?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Data permintaan tidak valid." }, { status: 400 });
  }

  const { bookId, participantId, emails, dateFrom, dateTo } = body;
  if (typeof bookId !== "string" || typeof participantId !== "undefined" && typeof participantId !== "string") {
    return NextResponse.json({ error: "Data buku atau peserta tidak valid." }, { status: 400 });
  }
  const clean = cleanEmails(emails);
  if (!clean || clean.length === 0) return NextResponse.json({ error: "Tambahkan minimal satu email yang valid (maksimal 20)." }, { status: 400 });

  const { data: book, error: bookError } = await supabase.from("books").select("id, name").eq("id", bookId).eq("user_id", user.id).single();
  if (bookError || !book) return NextResponse.json({ error: "Buku tidak ditemukan atau bukan milik Anda." }, { status: 403 });

  if (participantId) {
    const { data: participant } = await supabase.from("participants").select("id").eq("id", participantId).eq("book_id", bookId).single();
    if (!participant) return NextResponse.json({ error: "Peserta tidak ditemukan atau bukan milik Anda." }, { status: 403 });
  }

  const from = typeof dateFrom === "string" && dateFrom ? dateFrom : null;
  const to = typeof dateTo === "string" && dateTo ? dateTo : null;
  let shareQuery = supabase.from("recap_shares").select("token, enabled").eq("book_id", bookId);
  shareQuery = participantId ? shareQuery.eq("participant_id", participantId) : shareQuery.is("participant_id", null);
  const { data: existing } = await shareQuery.maybeSingle();

  let share = existing;
  if (!share) {
    const { data: created, error } = await supabase.from("recap_shares").insert({
      book_id: bookId,
      participant_id: participantId ?? null,
      enabled: true,
      date_from: from,
      date_to: to,
    }).select("token, enabled").single();
    if (error || !created) return NextResponse.json({ error: "Tautan rekap gagal dibuat." }, { status: 500 });
    share = created;
  } else {
    await supabase.from("recap_shares").update({ date_from: from, date_to: to, enabled: true }).eq("token", share.token);
    share.enabled = true;
  }

  const { data: recap } = await supabase.rpc("get_shared_recap", { p_token: share.token });
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const recapUrl = `${baseUrl}/rekap/${share.token}`;
  const fromEmail = process.env.RECAP_FROM_EMAIL;
  if (!process.env.RESEND_API_KEY || !fromEmail) {
    return NextResponse.json({ error: "Konfigurasi pengirim email belum lengkap." }, { status: 500 });
  }
  const resend = new Resend(process.env.RESEND_API_KEY);

  const summary = recap as {
    book_name?: string;
    scope?: string;
    totals?: { hadir: number; izin: number; alpha: number };
    participants?: { name: string; hadir: number; izin: number; alpha: number }[];
  } | null;
  const totals = summary?.totals ?? { hadir: 0, izin: 0, alpha: 0 };
  const period = from || to ? `${from ?? "Awal"} s/d ${to ?? "Sekarang"}` : "Semua periode";
  const tableRows = summary?.scope === "book"
    ? (summary.participants ?? []).map((participant) => `<tr><td>${escapeHtml(participant.name)}</td><td>${participant.hadir}</td><td>${participant.izin}</td><td>${participant.alpha}</td></tr>`).join("")
    : "";

  const results = [];
  for (const email of clean) {
    try {
      const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#0f172a"><h1 style="font-size:20px">Rekap ${escapeHtml(summary?.book_name ?? String(book.name))}</h1><p>${period}</p><p><strong>Hadir ${totals.hadir}</strong> &nbsp; Izin ${totals.izin} &nbsp; Alpa ${totals.alpha}</p>${tableRows ? `<table width="100%" cellpadding="8" style="border-collapse:collapse"><thead><tr style="background:#f1f5f9\"><th align="left">Peserta</th><th>Hadir</th><th>Izin</th><th>Alpa</th></tr></thead><tbody>${tableRows}</tbody></table>` : ""}<p style="margin-top:24px"><a href="${recapUrl}" style="display:inline-block;background:#2563eb;color:white;text-decoration:none;padding:12px 18px;border-radius:12px">Lihat rekap lengkap</a></p></div>`;
      const text = `Rekap ${summary?.book_name ?? String(book.name)}\nPeriode: ${period}\nHadir: ${totals.hadir}, Izin: ${totals.izin}, Alpa: ${totals.alpha}\nLihat rekap lengkap: ${recapUrl}`;
      const sent = await resend.emails.send({ from: fromEmail, to: email, subject: `Rekap absensi - ${summary?.book_name ?? String(book.name)}`, html, text });
      if (sent.error) results.push({ email, sent: false, reason: sent.error.message });
      else results.push({ email, sent: true });
    } catch (error) {
      results.push({ email, sent: false, reason: error instanceof Error ? error.message : "Pengiriman gagal." });
    }
  }
  return NextResponse.json({ results });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] ?? char);
}

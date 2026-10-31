import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import SharedRecap from "./SharedRecap";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const instant = false;

type Recap = {
  book_name: string;
  scope: "book" | "participant";
  participant_name?: string;
  date_from: string | null;
  date_to: string | null;
  totals?: { hadir: number; izin: number; alpha: number };
  participants?: {
    name: string;
    hadir: number;
    izin: number;
    alpha: number;
    history?: { tanggal: string; status: "hadir" | "izin" | "alpha"; catatan: string | null }[];
    records?: { tanggal: string; status: "hadir" | "izin" | "alpha"; catatan: string | null }[];
  }[];
  history?: { tanggal: string; status: "hadir" | "izin" | "alpha"; catatan: string | null }[];
};

export default async function RekapPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_recap", { p_token: token });
  const recap = !error && data ? data as Recap : null;

  return <SharedRecap recap={recap} />;
}

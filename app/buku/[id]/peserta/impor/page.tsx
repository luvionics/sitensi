import { redirect } from "next/navigation";

export default async function ImportPesertaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/buku/${encodeURIComponent(id)}/peserta`);
}
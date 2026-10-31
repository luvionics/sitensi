// Harus sama persis dengan isi enum `attendance_status` di database: {hadir,izin,alpha}
export const STATUSES = ["hadir", "izin", "alpha"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  hadir: "Hadir",
  izin: "Izin",
  alpha: "Alpa", // tulisan yang tampil di layar; boleh diganti "Alpha" bila mau
};

export const STATUS_ACTIVE: Record<Status, string> = {
  hadir: "border-emerald-600 bg-emerald-600 text-white",
  izin: "border-amber-500 bg-amber-500 text-white",
  alpha: "border-red-600 bg-red-600 text-white",
};

export const STATUS_DOT: Record<Status, string> = {
  hadir: "bg-emerald-500",
  izin: "bg-amber-500",
  alpha: "bg-red-500",
};

// Objek hitungan awal (semua status = 0), mengikuti isi STATUSES
export const emptyCounts = (): Record<Status, number> =>
  Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
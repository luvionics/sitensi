export type ParticipantField = { id: string; key: string; label: string; sort_order: number };

export function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.*()]/g, "")
    .replace(/[\s_-]+/g, "")
    .trim();
}

export function cleanLabel(label: string) {
  return label.trim().replace(/[.\s]+$/g, "").trim();
}

export function displayHeaders(fields: ParticipantField[]) {
  const counts = new Map<string, number>();
  fields.forEach((field) => {
    const label = cleanLabel(field.label) || field.key;
    counts.set(normalizeHeader(label), (counts.get(normalizeHeader(label)) ?? 0) + 1);
  });
  return fields.map((field) => {
    const label = cleanLabel(field.label) || field.key;
    return counts.get(normalizeHeader(label))! > 1 ? `${label} (${field.key})` : label;
  });
}

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    const text = "text" in value ? (value as { text?: unknown }).text : undefined;
    if (typeof text === "string") return text;
  }
  if (typeof value === "number") return String(value);
  return String(value);
}

export function slugKey(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/^_+|_+$/g, "");
  return slug || "kolom";
}

export function uniqueKey(base: string, keys: Set<string>) {
  let key = base;
  let suffix = 2;
  while (keys.has(key)) key = `${base}_${suffix++}`;
  return key;
}

export function safeSpreadsheetValue(value: unknown) {
  const text = cellText(value);
  return /^[=+@~-]/.test(text) ? `'${text}` : text;
}

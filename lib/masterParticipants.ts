export function masterFieldKey(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return normalized || "kolom";
}

export function uniqueMasterFieldKey(label: string, existingKeys: string[]): string {
  const base = masterFieldKey(label);
  let key = base;
  let suffix = 2;
  while (existingKeys.includes(key)) key = `${base}_${suffix++}`;
  return key;
}

export function cleanMasterData(data: Record<string, string>, keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = String(data[key] ?? "").trim();
    if (value) result[key] = value;
  }
  return result;
}

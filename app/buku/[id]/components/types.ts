export type Field = { id: string; key: string; label: string; sortOrder: number };

export type Participant = {
  id: string;
  name: string;
  email: string | null;
  data: Record<string, string>;
  sortOrder: number;
};
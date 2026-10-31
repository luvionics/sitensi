import type { FormEvent } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { Field } from "./types";
import ModalShell from "./ModalShell";
import { GripIcon, PencilIcon, TrashIcon } from "./icons";

type RowProps = {
  field: Field;
  busy: boolean;
  dragDisabled: boolean;
  editing: boolean;
  editLabel: string;
  onRemove: (field: Field) => void;
  onStartEdit: (field: Field) => void;
  onEditLabelChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
};

function SortableFieldRow({
  field,
  busy,
  dragDisabled,
  editing,
  editLabel,
  onRemove,
  onStartEdit,
  onEditLabelChange,
  onSaveEdit,
  onCancelEdit,
}: RowProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id, disabled: dragDisabled });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`bg-white px-2 py-1.5 ${isDragging ? "relative z-10 shadow-lg ring-1 ring-blue-200" : ""}`}
    >
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSaveEdit();
          }}
          className="flex items-center gap-2 px-1 py-1"
        >
          <input
            autoFocus
            value={editLabel}
            onChange={(e) => onEditLabelChange(e.target.value)}
            aria-label="Nama kolom"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!editLabel.trim() || busy}
            className="shrink-0 cursor-pointer rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Simpan
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={busy}
            className="shrink-0 cursor-pointer rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Batal
          </button>
        </form>
      ) : (
        <div className="flex items-center gap-1">
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Seret untuk mengubah urutan kolom ${field.label}`}
            className={`flex h-10 w-9 shrink-0 touch-none items-center justify-center rounded-lg text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              dragDisabled ? "cursor-not-allowed opacity-40" : "cursor-grab hover:bg-slate-100 active:cursor-grabbing"
            }`}
          >
            <GripIcon />
          </button>

          <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
            {field.label}
          </span>

          <button
            type="button"
            onClick={() => onStartEdit(field)}
            disabled={busy}
            aria-label={`Ganti nama kolom ${field.label}`}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(field)}
            disabled={busy}
            aria-label={`Hapus kolom ${field.label}`}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </li>
  );
}

type Props = {
  fields: Field[];
  label: string;
  busy: boolean;
  /** Menonaktifkan seret-urut (misalnya saat menyimpan atau mengedit nama) */
  dragDisabled: boolean;
  /** id kolom yang sedang diganti namanya (null = tidak ada) */
  editingId: string | null;
  editLabel: string;
  onLabelChange: (value: string) => void;
  onAdd: (e: FormEvent) => void;
  onRemove: (field: Field) => void;
  onStartEdit: (field: Field) => void;
  onEditLabelChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  /** Dipanggil dengan daftar kolom dalam urutan baru */
  onReorder: (next: Field[]) => void;
  onClose: () => void;
};

export default function FieldsModal({
  fields,
  label,
  busy,
  dragDisabled,
  editingId,
  editLabel,
  onLabelChange,
  onAdd,
  onRemove,
  onStartEdit,
  onEditLabelChange,
  onSaveEdit,
  onCancelEdit,
  onReorder,
  onClose,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = fields.findIndex((f) => f.id === active.id);
    const to = fields.findIndex((f) => f.id === over.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(fields, from, to));
  }

  return (
    <ModalShell onClose={onClose} labelledBy="fields-title">
      <h2 id="fields-title" className="text-lg font-semibold">
        Tentukan data peserta
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Tambah data tambahan untuk peserta, misalnya NIS, kelas, atau nomor HP. Mengganti nama kolom
        hanya mengubah tampilan, isi data peserta tetap aman.
        {fields.length > 1 && " Seret ikon titik-titik untuk mengatur urutan."}
      </p>

      <div className="mt-4 min-h-[6rem] flex-1 overflow-y-auto rounded-2xl border border-slate-200">
        {fields.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Belum ada kolom.</p>
        ) : (
          <DndContext
            id="fields-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-slate-100">
                {fields.map((f) => (
                  <SortableFieldRow
                    key={f.id}
                    field={f}
                    busy={busy}
                    dragDisabled={dragDisabled}
                    editing={editingId === f.id}
                    editLabel={editLabel}
                    onRemove={onRemove}
                    onStartEdit={onStartEdit}
                    onEditLabelChange={onEditLabelChange}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <form onSubmit={onAdd} className="mt-4 flex gap-2">
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          placeholder="Nama kolom, contoh: NIS"
          className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
          type="submit"
          disabled={!label.trim() || busy}
          className="shrink-0 cursor-pointer rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          Tambah
        </button>
      </form>

      <button
        type="button"
        onClick={onClose}
        className="mt-3 w-full cursor-pointer rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Selesai
      </button>
    </ModalShell>
  );
}
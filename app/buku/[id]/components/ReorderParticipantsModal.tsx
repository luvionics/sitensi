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
import { useState } from "react";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import type { Participant } from "./types";
import ModalShell from "./ModalShell";
import { ArrowDownIcon, ArrowUpIcon, GripIcon, XIcon } from "./icons";

type Props = {
  participants: Participant[];
  busy: boolean;
  onReorder: (next: Participant[]) => void | Promise<void>;
  onClose: () => void;
};

function SortableParticipantRow({
  participant,
  index,
  count,
  busy,
  onMove,
}: {
  participant: Participant;
  index: number;
  count: number;
  busy: boolean;
  onMove: (from: number, to: number) => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: participant.id, disabled: busy });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1 bg-white px-2 py-1.5 ${isDragging ? "relative z-10 shadow-lg ring-1 ring-blue-200" : ""}`}
    >
      <span className="w-6 shrink-0 text-center text-xs text-slate-400">{index + 1}</span>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={busy}
        aria-label={`Seret untuk mengubah urutan peserta ${participant.name}`}
        className="flex h-10 w-9 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripIcon />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{participant.name}</span>
      <button
        type="button"
        disabled={busy || index === 0}
        onClick={() => onMove(index, index - 1)}
        aria-label={`Naikkan ${participant.name}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowUpIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        disabled={busy || index === count - 1}
        onClick={() => onMove(index, index + 1)}
        aria-label={`Turunkan ${participant.name}`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowDownIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

export default function ReorderParticipantsModal({ participants, busy, onReorder, onClose }: Props) {
  const [draft, setDraft] = useState(participants);
  const [baseline, setBaseline] = useState(participants);
  const [confirmClose, setConfirmClose] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (busy || !over || active.id === over.id) return;
    const from = draft.findIndex((p) => p.id === active.id);
    const to = draft.findIndex((p) => p.id === over.id);
    if (from < 0 || to < 0) return;
    setDraft(arrayMove(draft, from, to));
  }

  function move(from: number, to: number) {
    if (busy || to < 0 || to >= draft.length) return;
    setDraft(arrayMove(draft, from, to));
  }

  const changed = draft.length === baseline.length &&
    draft.some((participant, index) => participant.id !== baseline[index]?.id);

  async function saveAndClose() {
    if (busy) return;
    if (changed) await onReorder(draft);
    onClose();
  }

  function requestClose() {
    if (busy) return;
    if (changed) setConfirmClose(true);
    else onClose();
  }

  return (
    <ModalShell onClose={requestClose} labelledBy="reorder-participants-title" panelClassName="relative">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="reorder-participants-title" className="text-lg font-semibold">Atur urutan peserta</h2>
          <p className="mt-1 text-sm text-slate-500">Seret untuk mengubah urutan. Urutan ini dipakai di daftar absensi.</p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Tutup"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <XIcon />
        </button>
      </div>

      <button
        type="button"
        disabled={busy || draft.length < 2}
        onClick={() => setDraft([...draft].sort((a, b) => a.name.localeCompare(b.name, "id")))}
        className="mt-4 w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Urutkan A–Z
      </button>

      <div className="mt-3 max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-200">
        {draft.length < 2 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Minimal dua peserta untuk mengatur urutan.</p>
        ) : (
          <DndContext
            id="participants-dnd"
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={draft.map((p) => p.id)} strategy={verticalListSortingStrategy}>
              <ul className="divide-y divide-slate-100">
                {draft.map((participant, index) => (
                  <SortableParticipantRow
                    key={participant.id}
                    participant={participant}
                    index={index}
                    count={draft.length}
                    busy={busy}
                    onMove={move}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="flex-1 cursor-pointer rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Batal
        </button>
        <button
          type="button"
          disabled={busy || !changed}
          onClick={() => void saveAndClose()}
          className="flex-1 cursor-pointer rounded-2xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
        >
          {busy ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
      {confirmClose && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-5 rounded-3xl">
          <div className="w-full rounded-3xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">Simpan perubahan urutan?</h3>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={onClose}
                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700"
              >
                Buang
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveAndClose()}
                className="flex-1 rounded-2xl bg-blue-600 py-2.5 text-sm font-medium text-white disabled:bg-blue-300"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

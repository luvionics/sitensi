import type { ReactNode } from "react";
import ModalShell from "./ModalShell";
import { ChevronRight, ColumnsIcon, UserPlusIcon, XIcon } from "./icons";

export type MenuFeature = {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  /** Kosong = fitur belum tersedia (tampil abu-abu dengan label "Segera") */
  onClick?: () => void;
};

type Props = {
  features: MenuFeature[];
  onAddManual: () => void;
  onDefineFields: () => void;
  onClose: () => void;
};

function MainCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-left hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-0.5 text-sm text-slate-600">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-blue-300" />
    </button>
  );
}

export default function AddMenuModal({ features, onAddManual, onDefineFields, onClose }: Props) {
  return (
    <ModalShell onClose={onClose} labelledBy="add-menu-title" panelClassName="overflow-y-auto">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id="add-menu-title" className="text-lg font-semibold">
            Kelola peserta
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Pilih apa yang ingin dilakukan di buku absensi ini.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <XIcon />
        </button>
      </div>

      {/* Kartu utama */}
      <div className="mt-5 space-y-3">
        <MainCard
          icon={<UserPlusIcon className="h-6 w-6" />}
          title="Tambah peserta manual"
          description="Masukkan nama, email, dan data peserta satu per satu."
          onClick={onAddManual}
        />
        <MainCard
          icon={<ColumnsIcon className="h-6 w-6" />}
          title="Tentukan data peserta"
          description="Atur data apa saja yang dicatat untuk setiap peserta, seperti NIS atau kelas, beserta urutannya."
          onClick={onDefineFields}
        />
      </div>

      {/* Fitur tambahan */}
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Fitur tambahan
      </p>
      <ul className="mt-2 space-y-2">
        {features.map((f) => {
          const available = Boolean(f.onClick);
          return (
            <li key={f.id}>
              <button
                type="button"
                onClick={f.onClick}
                disabled={!available}
                className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-blue-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:hover:border-slate-200"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    available ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"
                  }`}
                >
                  {f.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium ${available ? "text-slate-900" : "text-slate-500"}`}
                  >
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{f.description}</p>
                </div>
                {!available && (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    Segera
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </ModalShell>
  );
}
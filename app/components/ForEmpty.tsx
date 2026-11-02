"use client";

type IconProps = { className?: string };

function Svg({ className, children, w = 1.8 }: IconProps & { children: React.ReactNode; w?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const BookIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="m9 11 2 2 4-4" />
  </Svg>
);
const FolderIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </Svg>
);
const ChevronRight = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className} w={2.2}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);
const InfoIcon = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className} w={2}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.5h.01" />
  </Svg>
);

type Props = {
  /** True jika sedang berada di dalam folder */
  inFolder: boolean;
  /** Nama folder saat ini (jika ada) */
  folderName?: string | null;
  /** Dipanggil saat "Buat buku absen" diketuk */
  onNewBook: () => void;
  /** Dipanggil saat "Buat folder" diketuk */
  onNewFolder: () => void;
};

const EMPTY_CSS = `
.fe-pop{animation:fe-pop .3s cubic-bezier(.2,.9,.3,1.2) backwards}
@keyframes fe-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.fe-pop{animation:none}}
`;

/** Pemberitahuan dan arahan untuk pengguna yang sudah login tetapi belum punya buku/folder. */
export default function ForEmpty({ inFolder, folderName, onNewBook, onNewFolder }: Props) {
  const actions = [
    {
      key: "book",
      label: "Buat buku absen",
      description: "Untuk satu kelas atau kegiatan",
      icon: BookIcon,
      gradient: "from-blue-500 to-blue-700",
      onClick: onNewBook,
    },
    {
      key: "folder",
      label: "Buat folder",
      description: inFolder ? "Subfolder untuk mengelompokkan buku" : "Kelompokkan beberapa buku absen",
      icon: FolderIcon,
      gradient: "from-sky-500 to-blue-600",
      onClick: onNewFolder,
    },
  ];

  return (
    <section
      aria-label={inFolder ? "Folder kosong" : "Belum ada buku absensi"}
      className="fe-pop mt-8 rounded-3xl border border-dashed border-blue-200 bg-white px-5 py-10 text-center sm:px-8"
    >
      <style>{EMPTY_CSS}</style>

      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/25">
        {inFolder ? <FolderIcon className="h-10 w-10" /> : <BookIcon className="h-10 w-10" />}
      </div>

      <h2 className="mt-5 text-xl font-bold text-slate-900">
        {inFolder ? "Folder ini kosong" : "Belum ada buku absensi"}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
        {inFolder
          ? `Belum ada isi di dalam ${folderName || "folder ini"}. Tambahkan buku absen atau subfolder untuk memulai.`
          : "Buat buku absen pertama untuk mulai mencatat kehadiran, atau kelompokkan dengan folder."}
      </p>

      <div className="mx-auto mt-6 grid max-w-xl gap-3 text-left sm:grid-cols-2">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              onClick={a.onClick}
              className="fe-pop group flex w-full cursor-pointer items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.99]"
              style={{ animationDelay: `${100 + i * 60}ms` }}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.gradient} text-white shadow-md shadow-blue-600/20`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">
                  {a.label}
                </span>
                <span className="mt-0.5 block truncate text-sm text-slate-500">{a.description}</span>
              </span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                <ChevronRight />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100">
        <InfoIcon className="h-4 w-4 shrink-0" />
        Butuh bantuan? Ketuk ikon i di pojok kanan bawah.
      </p>
    </section>
  );
}
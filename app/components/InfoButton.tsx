"use client";

type Props = {
  /** Dipanggil saat tombol diketuk (membuka modal informasi) */
  onClick: () => void;
};

/** Tombol "i" bulat melayang di pojok kanan bawah untuk membuka modal informasi. */
export default function InfoButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Buka informasi"
      aria-haspopup="dialog"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
      className="fixed right-4 z-40 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/40 ring-2 ring-white hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M12 11v6" />
        <path d="M12 7h.01" />
      </svg>
    </button>
  );
}
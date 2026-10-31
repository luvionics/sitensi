
import Link from "next/link";

export default function FloatingFooter() {
  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-5">
      <Link
        href="/tentang"
        aria-label="Kenali Sitensi lebih lanjut"
        className="
          pointer-events-auto group
          inline-flex items-center justify-center gap-2.5
          rounded-full
          border border-blue-400/20
          bg-gradient-to-r from-blue-600 to-blue-500
          px-6 py-3
          text-sm font-semibold text-white
          shadow-[0_8px_25px_rgba(37,99,235,0.28)]
          transition-all duration-300 ease-out
          hover:-translate-y-1
          hover:from-blue-700 hover:to-blue-600
          hover:shadow-[0_12px_30px_rgba(37,99,235,0.35)]
          active:translate-y-0 active:scale-[0.97]
          focus-visible:outline-none
          focus-visible:ring-2 focus-visible:ring-blue-500
          focus-visible:ring-offset-2
        "
      >
        {/* Info Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px] opacity-95"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>

        <span>Kenali Sitensi</span>

        {/* Arrow Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        >
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </Link>
    </footer>
  );
}

type Props = {
  type: "success" | "error";
  message: string;
  onClose: () => void;
};

export default function Toast({ type, message, onClose }: Props) {
  const isError = type === "error";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div
        role={isError ? "alert" : "status"}
        className={`pointer-events-auto flex w-full max-w-md items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm text-white shadow-lg ${
          isError ? "bg-red-600" : "bg-emerald-600"
        }`}
      >
        <span className="min-w-0 break-words">{message}</span>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer font-medium hover:underline focus:outline-none focus-visible:underline"
        >
          Tutup
        </button>
      </div>
    </div>
  );
}
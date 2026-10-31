import type { ReactNode } from "react";
import { ChevronRight } from "./icons";

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  soon?: boolean;
};

export default function ActionItem({
  icon,
  title,
  description,
  onClick,
  danger = false,
  disabled = false,
  soon = false,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left focus:outline-none focus-visible:ring-2 ${
        danger
          ? "border-red-200 text-red-600 hover:bg-red-50 focus-visible:ring-red-500"
          : "border-slate-200 hover:border-blue-300 hover:bg-slate-50 focus-visible:ring-blue-500"
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          danger ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1 break-words">
        <p className={`whitespace-normal break-words text-sm font-semibold ${danger ? "text-red-600" : "text-slate-900"}`}>{title}</p>
        <p className={`mt-0.5 whitespace-normal break-words text-xs ${danger ? "text-red-500" : "text-slate-500"}`}>
          {description}
        </p>
      </div>
      <ChevronRight className={`h-5 w-5 shrink-0 ${danger ? "text-red-300" : "text-slate-300"}`} />
      {soon && (
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          Segera
        </span>
      )}
    </button>
  );
}

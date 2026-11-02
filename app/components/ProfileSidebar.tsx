"use client";

import { useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronRight,
  CloseIcon,
  LogoutIcon,
  SettingsIcon,
  UserIcon,
  type IconProps,
} from "./icons";

export type Profile = {
  initial: string;
  avatarUrl: string | null;
  name: string;
  email: string;
};

type ProfileSidebarProps = {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  loggingOut: boolean;
  onLogout: () => void;
};

const PROFILE_MENU: {
  label: string;
  description: string;
  icon: (p: IconProps) => React.ReactElement;
  gradient: string;
  href: string;
}[] = [
  {
    label: "Akun",
    description: "Pengaturan akun dan keamanan",
    icon: SettingsIcon,
    gradient: "from-blue-500 to-blue-700",
    href: "/akun",
  },
  {
    label: "Profil",
    description: "Lihat dan ubah profil",
    icon: UserIcon,
    gradient: "from-sky-500 to-blue-600",
    href: "/profil",
  },
];

// Animasi muncul membesar untuk item menu
const SIDEBAR_CSS = `
.sb-pop{animation:sb-pop .3s cubic-bezier(.2,.9,.3,1.2) backwards}
@keyframes sb-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.sb-pop{animation:none}}
`;

export default function ProfileSidebar({
  open,
  onClose,
  profile,
  loggingOut,
  onLogout,
}: ProfileSidebarProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  const handleClose = useCallback(() => onClose(), [onClose]);

  // Escape menutup sidebar
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, handleClose]);

  // Kunci scroll halaman saat sidebar terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fokus: ke tombol tutup saat dibuka, kembali ke elemen pemicu saat ditutup
  useEffect(() => {
    if (open) {
      lastFocused.current = document.activeElement as HTMLElement | null;
      wasOpen.current = true;
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      lastFocused.current?.focus();
    }
  }, [open]);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden ${
        open
          ? "visible"
          : "pointer-events-none invisible [transition:visibility_0s_linear_300ms]"
      }`}
      aria-hidden={!open}
    >
      <style>{SIDEBAR_CSS}</style>

      {/* Overlay */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu profil"
        className={`absolute inset-y-0 right-0 flex w-80 max-w-[88vw] flex-col overflow-hidden rounded-l-[2rem] bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Kepala panel: avatar + nama + email */}
        <div
          className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-700 to-blue-900 px-5 pb-6 text-white"
          style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.25rem)" }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 right-14 h-24 w-24 rounded-full bg-white/10"
          />

          <div className="relative flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3.5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/15 text-lg font-bold text-white ring-1 ring-white/30">
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt="Foto profil"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                ) : profile?.initial ? (
                  <span>{profile.initial}</span>
                ) : (
                  <UserIcon className="h-6 w-6" />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-100">
                  Akun saya
                </p>
                <h2 className="mt-0.5 truncate text-lg font-bold leading-tight">
                  {profile?.name || profile?.email || "Pengguna"}
                </h2>
                {profile?.name && profile?.email && (
                  <p className="truncate text-xs text-blue-100">{profile.email}</p>
                )}
              </div>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={handleClose}
              aria-label="Tutup menu"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 hover:bg-white/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-95"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Daftar menu */}
        <nav
          className="flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-5"
          aria-label="Navigasi profil"
        >
          <p className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Pilih menu
          </p>
          <ul className="space-y-3">
            {PROFILE_MENU.map((m, i) => {
              const Icon = m.icon;
              return (
                <li
                  key={m.label}
                  className={open ? "sb-pop" : ""}
                  style={{ animationDelay: `${80 + i * 60}ms` }}
                >
                  <Link
                    href={m.href}
                    onClick={handleClose}
                    className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.99]"
                  >
                    <span
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${m.gradient} text-white shadow-md shadow-blue-600/20`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">
                        {m.label}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {m.description}
                      </span>
                    </span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Kaki panel: keluar */}
        <div
          className="border-t border-slate-200 bg-white px-4 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.875rem)" }}
        >
          <button
            type="button"
            onClick={onLogout}
            disabled={loggingOut}
            className="group flex w-full cursor-pointer items-center gap-3.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left text-sm font-semibold text-slate-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors group-hover:bg-red-100 group-hover:text-red-600">
              <LogoutIcon className="h-5 w-5" />
            </span>
            {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </aside>
    </div>
  );
}
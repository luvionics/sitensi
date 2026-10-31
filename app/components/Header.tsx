"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  initial: string;
  avatarUrl: string | null;
  name: string;
  email: string;
};
type AuthState = "loading" | "guest" | "user";
type OpenMenu = "new" | "profile" | null;

type HeaderProps = {
  /** True jika sedang berada di dalam folder (menu "Folder Baru" disembunyikan) */
  inFolder: boolean;
  /** Dipanggil saat salah satu menu "Baru" dipilih */
  onNew: (type: "folder" | "book") => void;
};

function FolderIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

function BookIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
      <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  );
}

function PlusIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function ChevronDown({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function UserIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

function SettingsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function LogoutIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function Header({ inFolder, onNew }: HeaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Ambil profil pengguna
  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (!active) return;

      // Belum login (atau hanya sesi anonim): perlakukan sebagai tamu
      if (!user || user.is_anonymous) {
        setProfile(null);
        setAuthState("guest");
        return;
      }

      const { data: row } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      const meta = user.user_metadata ?? {};
      const name: string = row?.full_name || meta.full_name || meta.name || "";
      const email: string = row?.email || user.email || "";
      const label = name || email;

      setProfile({
        initial: label.trim().charAt(0).toUpperCase(),
        avatarUrl: row?.avatar_url || meta.avatar_url || meta.picture || null,
        name,
        email,
      });
      setAuthState("user");
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [supabase]);

  // Tutup dropdown saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideNew = newMenuRef.current?.contains(target);
      const insideProfile = profileMenuRef.current?.contains(target);
      if (!insideNew && !insideProfile) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  function handleNew(type: "folder" | "book") {
    setOpenMenu(null);
    onNew(type);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    setOpenMenu(null);
    setProfile(null);
    setAuthState("guest");
    setLoggingOut(false);
    router.refresh();
  }

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 focus:outline-none focus-visible:bg-slate-50";

  return (
    <header>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Brand: di mobile hanya ikon, teks tampil mulai layar sm */}
        <div className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/icons/icon-192.png"
            alt="Logo Sitensi"
            width={40}
            height={40}
            priority
            className="h-10 w-10 shrink-0 object-contain"
          />
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">Sitensi</span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          {/* Tamu: pemberitahuan login menggantikan tombol Baru */}
          {authState === "guest" && (
            <Link
              href="/login"
              className="min-w-0 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-1.5 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span className="block truncate text-xs font-semibold text-blue-700 sm:text-sm">
                Masuk untuk membuat buku absen
              </span>
              <span className="block truncate text-[11px] text-blue-600/80 sm:text-xs">
                Coba gratis 19 hari
              </span>
            </Link>
          )}

          {/* Pengguna login: tombol Baru + dropdown */}
          {authState === "user" && (
            <div ref={newMenuRef} className="relative">
              <button
                onClick={() => setOpenMenu((v) => (v === "new" ? null : "new"))}
                aria-haspopup="menu"
                aria-expanded={openMenu === "new"}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:px-4 sm:py-2.5"
              >
                <PlusIcon />
                <span>Baru</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${openMenu === "new" ? "rotate-180" : ""}`} />
              </button>

              {openMenu === "new" && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  <button
                    role="menuitem"
                    onClick={() => handleNew("book")}
                    className={menuItemClass}
                  >
                    <BookIcon className="h-5 w-5 text-blue-600" />
                    Buku Absen Baru
                  </button>
                  {!inFolder && (
                    <button
                      role="menuitem"
                      onClick={() => handleNew("folder")}
                      className={menuItemClass}
                    >
                      <FolderIcon className="h-5 w-5 text-blue-600" />
                      Folder Baru
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Profil: bulatan jika sudah login, tombol Masuk jika belum */}
          {authState === "loading" && (
            <div className="ml-1 h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
          )}

          {authState === "guest" && (
            <Link
              href="/login"
              className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Masuk
            </Link>
          )}

          {authState === "user" && (
            <div ref={profileMenuRef} className="relative">
              <button
                onClick={() => setOpenMenu((v) => (v === "profile" ? null : "profile"))}
                aria-haspopup="menu"
                aria-expanded={openMenu === "profile"}
                aria-label="Menu profil"
                title="Profil"
                className="ml-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700 hover:ring-2 hover:ring-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
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
                  <UserIcon className="h-5 w-5" />
                )}
              </button>

              {openMenu === "profile" && (
                <div
                  role="menu"
                  className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg"
                >
                  {(profile?.name || profile?.email) && (
                    <div className="mb-1 border-b border-slate-100 px-3 pb-2.5 pt-2">
                      {profile?.name && (
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {profile.name}
                        </p>
                      )}
                      {profile?.email && (
                        <p className="truncate text-xs text-slate-500">{profile.email}</p>
                      )}
                    </div>
                  )}

                  <Link
                    href="/akun"
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                    className={menuItemClass}
                  >
                    <SettingsIcon className="h-5 w-5 text-blue-600" />
                    Akun
                  </Link>

                  <Link
                    href="/profil"
                    role="menuitem"
                    onClick={() => setOpenMenu(null)}
                    className={menuItemClass}
                  >
                    <UserIcon className="h-5 w-5 text-blue-600" />
                    Profil
                  </Link>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 focus:outline-none focus-visible:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogoutIcon className="h-5 w-5" />
                    {loggingOut ? "Keluar..." : "Keluar"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
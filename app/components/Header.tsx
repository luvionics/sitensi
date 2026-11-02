"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
type OpenMenu = "new" | null;

type HeaderProps = {
  /** True jika sedang berada di dalam folder (menu "Folder Baru" disembunyikan) */
  inFolder: boolean;
  /** Dipanggil saat salah satu menu "Baru" dipilih */
  onNew: (type: "folder" | "book") => void;
};

type IconProps = { className?: string };

function Svg({ className, children, w = 2 }: IconProps & { children: React.ReactNode; w?: number }) {
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

const FolderIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </Svg>
);
const BookIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5v-15Z" />
    <path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
    <path d="m9 11 2 2 4-4" />
  </Svg>
);
const PlusIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><path d="M12 5v14M5 12h14" /></Svg>
);
const ChevronDown = ({ className = "h-4 w-4" }: IconProps) => (
  <Svg className={className}><path d="m6 9 6 6 6-6" /></Svg>
);
const UserIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </Svg>
);
const SettingsIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Svg>
);
const LogoutIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className} w={1.8}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);
const CloseIcon = ({ className = "h-5 w-5" }: IconProps) => (
  <Svg className={className}><path d="M18 6 6 18M6 6l12 12" /></Svg>
);
const MenuIcon = ({ className = "h-6 w-6" }: IconProps) => (
  <Svg className={className} w={2}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

const PROFILE_MENU: {
  label: string;
  description: string;
  icon: (p: IconProps) => React.ReactElement;
  href: string;
}[] = [
  {
    label: "Akun",
    description: "Pengaturan akun dan keamanan",
    icon: SettingsIcon,
    href: "/akun",
  },
  {
    label: "Profil",
    description: "Lihat dan ubah profil",
    icon: UserIcon,
    href: "/profil",
  },
];

export default function Header({ inFolder, onNew }: HeaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

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

  // Tutup dropdown "Baru" saat klik di luar atau tekan Escape
  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (!newMenuRef.current?.contains(e.target as Node)) setOpenMenu(null);
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

  // Escape menutup sidebar
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  // Kunci scroll halaman saat sidebar terbuka
  useEffect(() => {
    if (!sidebarOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  // Fokus: ke tombol tutup saat dibuka, kembali ke hamburger saat ditutup
  useEffect(() => {
    if (sidebarOpen) {
      const t = window.setTimeout(() => closeBtnRef.current?.focus(), 50);
      wasOpen.current = true;
      return () => window.clearTimeout(t);
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [sidebarOpen]);

  function handleNew(type: "folder" | "book") {
    setOpenMenu(null);
    onNew(type);
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    await supabase.auth.signOut();
    setSidebarOpen(false);
    setOpenMenu(null);
    setProfile(null);
    setAuthState("guest");
    setLoggingOut(false);
    router.refresh();
  }

  const menuItemClass =
    "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-700 focus:outline-none focus-visible:bg-slate-50";

  const sidebarItemClass =
    "flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

  return (
    <header>
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        {/* Brand: logo + wordmark SITENSI */}
        <Link
          href="/"
          aria-label="Sitensi, ke beranda"
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Image
            src="/icons/icon-192.png"
            alt=""
            width={40}
            height={40}
            priority
            className="h-10 w-10 shrink-0 object-contain"
          />
          <span className="hidden min-[360px]:flex min-[360px]:flex-col min-[360px]:leading-none">
            <span className="text-[19px] font-extrabold uppercase tracking-[0.18em] text-blue-900">
              SITEN<span className="text-blue-500">SI</span>
            </span>
            <span className="mt-1 hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400 sm:block">
              Absensi Digital
            </span>
          </span>
        </Link>

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
                  <button role="menuitem" onClick={() => handleNew("book")} className={menuItemClass}>
                    <BookIcon className="h-5 w-5 text-blue-600" />
                    Buku Absen Baru
                  </button>
                  {!inFolder && (
                    <button role="menuitem" onClick={() => handleNew("folder")} className={menuItemClass}>
                      <FolderIcon className="h-5 w-5 text-blue-600" />
                      Folder Baru
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Memuat */}
          {authState === "loading" && (
            <div className="ml-1 h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200" />
          )}

          {/* Tamu: tombol Masuk */}
          {authState === "guest" && (
            <Link
              href="/login"
              className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Masuk
            </Link>
          )}

          {/* Pengguna login: ikon hamburger (tanpa latar) pembuka sidebar */}
          {authState === "user" && (
            <button
              ref={triggerRef}
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setSidebarOpen(true);
              }}
              aria-label="Buka menu profil"
              aria-haspopup="dialog"
              aria-expanded={sidebarOpen}
              className="ml-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-700 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar profil: overlay + panel */}
      {authState === "user" && (
        <div
          className={`fixed inset-0 z-50 ${sidebarOpen ? "" : "pointer-events-none"}`}
          aria-hidden={!sidebarOpen}
        >
          <div
            onClick={closeSidebar}
            className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-200 ${
              sidebarOpen ? "opacity-100" : "opacity-0"
            }`}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu profil"
            className={`absolute inset-y-0 right-0 flex w-72 max-w-[85vw] flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-out ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {/* Header panel: avatar + nama + email */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
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
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900">
                    {profile?.name || profile?.email || "Pengguna"}
                  </h2>
                  {profile?.name && profile?.email && (
                    <p className="truncate text-xs text-slate-500">{profile.email}</p>
                  )}
                </div>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={closeSidebar}
                aria-label="Tutup menu"
                tabIndex={sidebarOpen ? 0 : -1}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Daftar menu */}
            <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Navigasi profil">
              <ul className="space-y-1">
                {PROFILE_MENU.map((m) => {
                  const Icon = m.icon;
                  return (
                    <li key={m.label}>
                      <Link
                        href={m.href}
                        onClick={closeSidebar}
                        tabIndex={sidebarOpen ? 0 : -1}
                        className={sidebarItemClass}
                      >
                        <Icon className="h-5 w-5 shrink-0 text-slate-500" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{m.label}</span>
                          <span className="block truncate text-xs font-normal text-slate-500">
                            {m.description}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Footer: keluar */}
            <div className="border-t border-slate-200 px-2 py-3">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                tabIndex={sidebarOpen ? 0 : -1}
                className={`${sidebarItemClass} hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <LogoutIcon className="h-5 w-5 shrink-0 text-slate-500" />
                {loggingOut ? "Keluar..." : "Keluar"}
              </button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
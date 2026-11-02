"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ProfileSidebar, { type Profile } from "./ProfileSidebar";
import {
  BookIcon,
  ChevronDown,
  FolderIcon,
  MenuIcon,
  PlusIcon,
  type IconProps,
} from "./icons";

type AuthState = "loading" | "guest" | "user";
type OpenMenu = "new" | null;

type HeaderProps = {
  /** True jika sedang berada di dalam folder (menu "Folder Baru" disembunyikan) */
  inFolder: boolean;
  /** Dipanggil saat salah satu menu "Baru" dipilih */
  onNew: (type: "folder" | "book") => void;
};

const NEW_MENU: {
  type: "book" | "folder";
  label: string;
  description: string;
  icon: (p: IconProps) => React.ReactElement;
  gradient: string;
}[] = [
  {
    type: "book",
    label: "Buku Absen Baru",
    description: "Catat kehadiran peserta",
    icon: BookIcon,
    gradient: "from-blue-500 to-blue-700",
  },
  {
    type: "folder",
    label: "Folder Baru",
    description: "Kelompokkan beberapa buku",
    icon: FolderIcon,
    gradient: "from-sky-500 to-blue-600",
  },
];

// Animasi muncul membesar (tombol dan dropdown) + teks berjalan (marquee) pemberitahuan tamu.
// Track berisi dua salinan teks; digeser 50% lalu mengulang sehingga tampak menyambung.
const HEADER_CSS = `
.hd-pop{animation:hd-pop .3s cubic-bezier(.2,.9,.3,1.2) backwards}
@keyframes hd-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.hd-marquee{display:flex;width:max-content;animation:hd-marquee 9s linear infinite}
@keyframes hd-marquee{from{transform:none}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion: reduce){
  .hd-pop{animation:none}
  .hd-marquee{animation:none}
  .hd-marquee>span:last-child{display:none}
}
`;

export default function Header({ inFolder, onNew }: HeaderProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const newMenuRef = useRef<HTMLDivElement>(null);

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

  const newItems = NEW_MENU.filter((m) => !(m.type === "folder" && inFolder));

  return (
    <>
      <style>{HEADER_CSS}</style>

      {/* Header melayang: menempel di atas saat halaman di-scroll */}
      <header
        className="sticky top-0 z-40 px-3 sm:px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.5rem)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-[2rem] border border-blue-100 bg-white px-3 py-2 shadow-lg shadow-slate-900/10 sm:px-4">
          {/* Brand: logo + wordmark SITENSI */}
          <Link
            href="/"
            aria-label="Sitensi, ke beranda"
            className="flex shrink-0 items-center gap-3 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Image
              src="/icons/icon-192x192.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0 rounded-xl object-contain shadow-md shadow-blue-600/25"
            />
            <span className="hidden min-[360px]:flex min-[360px]:flex-col min-[360px]:leading-none">
              <span className="text-xl font-extrabold uppercase tracking-[0.16em]">
                <span className="bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                  SITEN
                </span>
                <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                  SI
                </span>
              </span>
              <span className="mt-1.5 hidden text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-500 sm:block">
                Absensi Digital
              </span>
            </span>
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            {/* Tamu: pemberitahuan login (teks berjalan di mobile, diam di layar lebar) */}
            {authState === "guest" && (
              <Link
                href="/login"
                aria-label="Masuk untuk membuat buku absen"
                className="hd-pop min-w-0 flex-1 overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 py-2.5 text-left hover:border-blue-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:flex-none sm:px-3.5"
              >
                {/* Mobile: marquee dengan tepi memudar */}
                <span
                  aria-hidden="true"
                  className="block overflow-hidden text-xs font-semibold text-blue-800 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] sm:hidden"
                >
                  <span className="hd-marquee">
                    <span className="shrink-0 whitespace-nowrap pr-8">
                      Masuk untuk membuat buku absen
                    </span>
                    <span className="shrink-0 whitespace-nowrap pr-8">
                      Masuk untuk membuat buku absen
                    </span>
                  </span>
                </span>

                {/* Layar lebar: teks diam */}
                <span className="hidden whitespace-nowrap text-sm font-semibold text-blue-800 sm:block">
                  Masuk untuk membuat buku absen
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
                  className="hd-pop inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-4 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 sm:px-5"
                >
                  <PlusIcon />
                  <span>Baru</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      openMenu === "new" ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {openMenu === "new" && (
                  <div
                    role="menu"
                    className="hd-pop absolute right-0 z-40 mt-3 w-72 origin-top-right overflow-hidden rounded-3xl border border-slate-200 bg-white p-2 shadow-2xl"
                  >
                    {newItems.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.type}
                          role="menuitem"
                          onClick={() => handleNew(m.type)}
                          className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-blue-50 focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${m.gradient} text-white shadow-md shadow-blue-600/20`}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                              {m.label}
                            </span>
                            <span className="block truncate text-xs text-slate-500">
                              {m.description}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Memuat */}
            {authState === "loading" && (
              <div className="ml-1 h-11 w-11 shrink-0 animate-pulse rounded-full bg-blue-100" />
            )}

            {/* Tamu: tombol Masuk */}
            {authState === "guest" && (
              <Link
                href="/login"
                className="hd-pop inline-flex h-11 shrink-0 cursor-pointer items-center rounded-full bg-gradient-to-r from-blue-500 to-blue-700 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95"
              >
                Masuk
              </Link>
            )}

            {/* Pengguna login: tombol hamburger pembuka sidebar */}
            {authState === "user" && (
              <button
                type="button"
                onClick={() => {
                  setOpenMenu(null);
                  setSidebarOpen(true);
                }}
                aria-label="Buka menu profil"
                aria-haspopup="dialog"
                aria-expanded={sidebarOpen}
                className="hd-pop flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-blue-700 shadow-md shadow-slate-900/10 ring-1 ring-blue-100 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-90"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar profil: di luar <header> agar tidak terkurung lapisan sticky */}
      {authState === "user" && (
        <ProfileSidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          profile={profile}
          loggingOut={loggingOut}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}
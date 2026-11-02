"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1C6.23 6.86 8.88 4.75 12 4.75Z" />
    </svg>
  );
}

function ArrowLeftIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

function SparkleIcon({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2L12 2Z" />
      <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z" />
    </svg>
  );
}

function EyeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M17.94 17.94A10.5 10.5 0 0 1 12 19C5.6 19 2 12 2 12a18.5 18.5 0 0 1 4.06-5.06" />
      <path d="M9.9 4.24A9.8 9.8 0 0 1 12 4c6.4 0 10 8 10 8a18.6 18.6 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const INPUT_CLASS =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-base placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 sm:text-sm";

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configError] = useState(() => {
    try {
      createClient();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : "Konfigurasi Supabase tidak valid.";
    }
  });

  // Tampilkan galat dari callback Google (?error=auth)
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError("Login dengan Google gagal. Coba lagi.");
    }
  }, []);

  // Jika sudah login (bukan sesi tamu/anonim), langsung ke beranda
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !data.user.is_anonymous) router.replace("/");
    });
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || googleLoading) return;

    setLoading(true);
    setError(null);

    if (!supabase) {
      setError(configError ?? "Konfigurasi Supabase tidak valid.");
      setLoading(false);
      return;
    }

    let authError: { message: string } | null;
    try {
      const result = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      authError = result.error;
    } catch {
      setError("Tidak dapat terhubung ke Supabase. Periksa konfigurasi production dan hostname Supabase.");
      setLoading(false);
      return;
    }

    if (authError) {
      setError(
        authError.message.toLowerCase().includes("invalid login")
          ? "Email atau kata sandi salah."
          : authError.message
      );
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  async function handleGoogle() {
    if (loading || googleLoading) return;

    setGoogleLoading(true);
    setError(null);

    if (!supabase) {
      setError(configError ?? "Konfigurasi Supabase tidak valid.");
      setGoogleLoading(false);
      return;
    }

    let authError: { message: string } | null;
    try {
      const result = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      authError = result.error;
    } catch {
      setError("Tidak dapat terhubung ke Supabase. Periksa konfigurasi production dan hostname Supabase.");
      setGoogleLoading(false);
      return;
    }

    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
  }

  const busy = loading || googleLoading;

  return (
    <div className="relative min-h-dvh text-slate-900">
      <style>{`
        @keyframes lg-pop {
          from { opacity: 0; transform: scale(.94) translateY(8px); }
          to   { opacity: 1; transform: none; }
        }
        .lg-pop { animation: lg-pop .35s cubic-bezier(.2,.9,.3,1.1) both; }
        @keyframes shimmer-sweep {
          0%   { transform: translateX(-160%) skewX(-20deg); }
          100% { transform: translateX(380%) skewX(-20deg); }
        }
        .shimmer-sweep { animation: shimmer-sweep 2.4s ease-in-out infinite; }
        @keyframes sparkle-twinkle {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
          50%      { transform: scale(1.25) rotate(15deg); opacity: 0.8; }
        }
        .sparkle-twinkle { animation: sparkle-twinkle 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lg-pop, .shimmer-sweep, .sparkle-twinkle { animation: none; }
        }
      `}</style>

      {/* Latar: menutupi seluruh layar dan memotong lingkaran dekoratif di dalamnya */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-gradient-to-b from-blue-50 via-slate-50 to-slate-50"
      >
        <span className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-blue-200/40" />
        <span className="absolute -bottom-28 -right-20 h-80 w-80 rounded-full bg-sky-200/40" />
      </div>

      {/* Tombol kembali: pojok kiri atas */}
      <Link
        href="/"
        aria-label="Kembali ke beranda"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
        className="absolute left-4 z-20 inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-blue-700 shadow-md shadow-slate-900/10 ring-1 ring-blue-100 transition hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 sm:left-6"
      >
        <ArrowLeftIcon />
        Kembali
      </Link>

      {/* Konten */}
      <div className="relative z-10 flex min-h-dvh items-center justify-center px-4 pb-10 pt-24">
        <div className="lg-pop w-full max-w-sm">
          {/* Brand */}
          <div className="flex flex-col items-center text-center">
            <Image
              src="/icons/icon-192x192.png"
              alt=""
              width={64}
              height={64}
              priority
              className="h-16 w-16 rounded-2xl object-contain shadow-lg shadow-blue-600/25 ring-4 ring-white"
            />
            <p className="mt-4 text-xl font-extrabold uppercase tracking-[0.16em]">
              <span className="bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">SITEN</span>
              <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">SI</span>
            </p>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Selamat datang</h1>
            <p className="mt-1.5 text-sm text-slate-500">Masuk untuk mengelola buku absensi kamu.</p>
          </div>

          <div className="mt-7 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5">
            {/* Tombol Google + label Recommended */}
            <div className="relative">
              <span className="absolute -top-3 right-5 z-10 inline-flex items-center gap-1 overflow-hidden rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white ring-2 ring-white">
                <SparkleIcon className="sparkle-twinkle h-3 w-3" />
                Recommended
                <span
                  aria-hidden="true"
                  className="shimmer-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                />
              </span>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={busy}
                className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-blue-200 bg-white py-3.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-blue-100 transition hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {googleLoading ? <Spinner className="h-5 w-5 text-blue-600" /> : <GoogleIcon />}
                {googleLoading ? "Mengalihkan..." : "Lanjutkan dengan Google"}
              </button>
            </div>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              atau masuk dengan email
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className={`mt-1.5 ${INPUT_CLASS}`}
              />

              <label htmlFor="password" className="mt-4 block text-sm font-semibold text-slate-700">
                Kata sandi
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kata sandi"
                  className={`${INPUT_CLASS} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 hover:bg-blue-50 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {error && (
                <p role="alert" className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !email.trim() || !password}
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 py-3.5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition hover:from-blue-600 hover:to-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {loading && <Spinner />}
                {loading ? "Masuk..." : "Masuk"}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Dengan masuk, kamu menyetujui penggunaan aplikasi Sitensi.
          </p>
        </div>
      </div>
    </div>
  );
}
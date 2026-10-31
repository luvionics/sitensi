import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sitensi | Absensi Mudah & Cepat",
    template: "%s | Sitensi",
  },
  description:
    "Sitensi adalah aplikasi absensi online yang mudah dan cepat untuk sekolah, kampus, dan perusahaan. Catat kehadiran, pantau rekap, dan kelola data absensi secara real-time dari mana saja.",
  keywords: [
    "Sitensi",
    "absensi online",
    "aplikasi absensi",
    "absensi mudah",
    "absensi cepat",
    "absensi digital",
    "sistem absensi",
    "absensi sekolah",
    "absensi karyawan",
    "absensi siswa",
    "rekap kehadiran",
    "presensi online",
    "manajemen kehadiran",
  ],
  applicationName: "Sitensi",
  authors: [{ name: "Sitensi" }],
  creator: "Sitensi",
  publisher: "Sitensi",
  openGraph: {
    title: "Sitensi | Absensi Mudah & Cepat",
    description:
      "Aplikasi absensi online yang mudah dan cepat. Catat kehadiran, pantau rekap, dan kelola data absensi secara real-time.",
    siteName: "Sitensi",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sitensi | Absensi Mudah & Cepat",
    description:
      "Aplikasi absensi online yang mudah dan cepat. Catat kehadiran, pantau rekap, dan kelola data absensi secara real-time.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

import Image from "next/image";
import Link from "next/link";

const features = [
  {
    number: "01",
    icon: "＋",
    title: "Buat buku absensi",
    description:
      "Buat buku absensi sesuai kebutuhan. Bisa untuk kelas, kursus, kegiatan, organisasi, atau keperluan lainnya.",
  },
  {
    number: "02",
    icon: "♙",
    title: "Kelola peserta",
    description:
      "Tambahkan peserta satu per satu atau gunakan fitur impor untuk memasukkan data peserta dengan lebih praktis.",
  },
  {
    number: "03",
    icon: "✓",
    title: "Catat kehadiran",
    description:
      "Lakukan pencatatan kehadiran peserta melalui buku absensi digital. Tidak perlu lagi repot dengan buku kertas.",
  },
  {
    number: "04",
    icon: "▤",
    title: "Rekap otomatis",
    description:
      "Data kehadiran tersimpan dan direkap secara otomatis. Kamu bisa melihat riwayat serta hasil absensi dengan lebih mudah.",
  },
];

const additionalFeatures = [
  "Impor data peserta melalui Excel atau CSV",
  "Ekspor hasil rekap absensi",
  "Tautan pendaftaran peserta",
  "Berbagi hasil rekap absensi",
  "Mengatur urutan daftar peserta",
  "Pengelompokan buku absensi dengan folder",
];

const audiences = [
  {
    title: "Guru dan pengajar",
    description: "Kelola kehadiran siswa di setiap kelas atau mata pelajaran.",
    icon: "✎",
  },
  {
    title: "Kursus dan bimbingan belajar",
    description: "Catat kehadiran peserta di setiap kelas atau program belajar.",
    icon: "▣",
  },
  {
    title: "Sekolah dan lembaga pendidikan",
    description: "Gunakan buku absensi digital untuk berbagai kegiatan pendidikan.",
    icon: "⌂",
  },
  {
    title: "Organisasi dan komunitas",
    description: "Kelola kehadiran anggota dalam pertemuan dan kegiatan rutin.",
    icon: "♧",
  },
  {
    title: "Panitia kegiatan",
    description: "Buat daftar peserta dan catat kehadiran dalam sebuah acara.",
    icon: "▤",
  },
  {
    title: "Siapa saja",
    description: "Buat buku absensi untuk kebutuhan pribadi maupun kelompok.",
    icon: "＋",
  },
];

export default function TentangPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-white text-slate-900">
      {/* Navigasi */}
      <header className="relative z-10 border-b border-slate-100 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/icons/icon-192.png"
              alt="Logo Sitensi"
              width={40}
              height={40}
              priority
              className="h-10 w-10 object-contain"
            />
            <span className="text-lg font-bold tracking-tight">Sitensi</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#tentang" className="transition hover:text-blue-600">
              Tentang
            </a>
            <a href="#fitur" className="transition hover:text-blue-600">
              Fitur
            </a>
            <a href="#pengguna" className="transition hover:text-blue-600">
              Untuk Siapa?
            </a>
            <a href="#harga" className="transition hover:text-blue-600">
              Harga
            </a>
          </nav>

          <Link
            href="/login"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Mulai Sekarang
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-50 via-white to-white" />
        <div className="absolute -right-40 top-10 -z-10 h-96 w-96 rounded-full bg-blue-100/60 blur-3xl" />
        <div className="absolute -left-40 top-48 -z-10 h-72 w-72 rounded-full bg-indigo-100/50 blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:gap-10">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-xs font-semibold text-blue-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Kenalan dengan Sitensi
            </div>

            <h1 className="max-w-xl text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-[58px]">
              Urusan absensi,
              <span className="block text-blue-600">
                jadi lebih mudah.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-8 text-slate-600 sm:text-lg">
              Tidak perlu lagi repot mengelola absensi secara manual.
              Buat buku absensi digital, tambahkan peserta, catat
              kehadiran, dan dapatkan rekap secara otomatis bersama Sitensi.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Coba Sitensi Sekarang
                <span aria-hidden="true">→</span>
              </Link>
              <a
                href="#fitur"
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                Kenali Fiturnya
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-slate-500">
              <span className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                Praktis digunakan
              </span>
              <span className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                Rekap otomatis
              </span>
              <span className="flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                Harga terjangkau
              </span>
            </div>
          </div>

          {/* Ilustrasi tampilan aplikasi */}
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-blue-200/60 to-indigo-100/40 blur-2xl" />

            <div className="relative rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-blue-900/10 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">
                    ✓
                  </div>
                  <div>
                    <p className="text-sm font-bold">Buku Absensi</p>
                    <p className="text-xs text-slate-400">Matematika</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Aktif
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5">
                <div className="rounded-2xl bg-blue-50 p-3">
                  <p className="text-xs text-slate-500">Peserta</p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">24</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <p className="text-xs text-slate-500">Hadir</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">20</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <p className="text-xs text-slate-500">Izin</p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">2</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold">Daftar Peserta</p>
                  <span className="text-xs font-medium text-blue-600">
                    Lihat rekap →
                  </span>
                </div>

                {[
                  ["Ahmad", "Hadir", "emerald"],
                  ["Budi", "Hadir", "emerald"],
                  ["Citra", "Izin", "amber"],
                  ["Dina", "Hadir", "emerald"],
                  ["Farhan", "Hadir", "emerald"],
                ].map(([name, status, color], index) => (
                  <div
                    key={name}
                    className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {name}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        color === "emerald"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl bg-blue-600 p-4 text-white">
                <div>
                  <p className="text-xs text-blue-100">Rekap kehadiran</p>
                  <p className="mt-1 text-sm font-semibold">
                    Semua tercatat otomatis.
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl">
                  ✓
                </div>
              </div>
            </div>

            <div className="absolute -bottom-6 -left-5 hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-xl sm:block">
              <p className="text-xs text-slate-500">Lebih praktis</p>
              <p className="mt-1 text-sm font-bold text-slate-800">
                Tanpa rekap manual
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tentang */}
      <section id="tentang" className="scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Apa itu Sitensi?
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Sederhana, seperti buku absensi.
            <span className="block text-blue-600">
              Hanya saja, sekarang digital.
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-600">
            Sitensi adalah aplikasi buku absensi digital yang membantu kamu
            membuat dan mengelola pencatatan kehadiran dengan lebih praktis.
            Kamu bisa membuat buku absensi sendiri, menambahkan peserta,
            mencatat kehadiran, dan melihat hasil rekap tanpa harus
            menghitungnya satu per satu.
          </p>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-slate-600">
            Tidak harus sekolah atau lembaga besar. Siapa pun yang membutuhkan
            buku absensi bisa menggunakan Sitensi sesuai kebutuhannya.
          </p>
        </div>
      </section>

      {/* Masalah */}
      <section className="bg-slate-50 px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Kenapa Sitensi?
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Absensi seharusnya tidak merepotkan.
            </h2>
            <p className="mt-5 leading-8 text-slate-600">
              Mencatat kehadiran mungkin terlihat sederhana. Namun ketika
              peserta semakin banyak dan kegiatan semakin rutin, mengelola
              daftar hadir serta membuat rekap bisa menyita waktu.
            </p>
            <p className="mt-4 leading-8 text-slate-600">
              Sitensi hadir untuk membantu menyederhanakan proses tersebut.
              Kamu bisa lebih fokus pada kegiatan, sementara pencatatan dan
              rekap kehadiran dikelola secara digital.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: "▤",
                title: "Tidak perlu buku kertas",
                text: "Kelola daftar peserta dan kehadiran melalui satu aplikasi.",
              },
              {
                icon: "◷",
                title: "Hemat waktu",
                text: "Tidak perlu menghitung ulang kehadiran peserta secara manual.",
              },
              {
                icon: "✓",
                title: "Data lebih tertata",
                text: "Setiap buku absensi dapat dikelola sesuai kebutuhan.",
              },
              {
                icon: "↗",
                title: "Rekap lebih mudah",
                text: "Lihat dan ekspor hasil pencatatan kehadiran.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                  {item.icon}
                </div>
                <h3 className="mt-4 font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fitur utama */}
      <section id="fitur" className="scroll-mt-20 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Cara kerja Sitensi
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Dari membuat buku hingga rekap,
              <span className="block text-blue-600">semuanya lebih praktis.</span>
            </h2>
            <p className="mt-5 leading-7 text-slate-600">
              Tidak perlu proses yang rumit. Cukup ikuti langkah-langkah
              sederhana berikut.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.number}
                className="group rounded-3xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-2xl font-semibold text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                    {feature.icon}
                  </div>
                  <span className="text-sm font-bold text-slate-300">
                    {feature.number}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl border border-blue-100 bg-blue-50/60 p-6 sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl text-white">
                ✦
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Fitur tambahan yang membantu</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Sitensi juga menyediakan berbagai fitur untuk mempermudah
                  pengelolaan buku absensi.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {additionalFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 font-bold text-blue-600">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Target pengguna */}
      <section id="pengguna" className="scroll-mt-20 bg-slate-50 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
              Siapa yang bisa menggunakan?
            </p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Untuk berbagai kebutuhan absensi.
            </h2>
            <p className="mt-5 leading-7 text-slate-600">
              Sitensi dibuat fleksibel. Kamu tidak harus berasal dari
              lembaga tertentu untuk bisa menggunakannya.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map((audience) => (
              <div
                key={audience.title}
                className="flex gap-4 rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-600">
                  {audience.icon}
                </div>
                <div>
                  <h3 className="font-bold">{audience.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {audience.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pengembangan */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white sm:p-12">
          <div className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
                Terus berkembang
              </p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                Bukan hanya mencatat. Kami ingin membuat pengelolaan absensi
                semakin mudah.
              </h2>
              <p className="mt-5 leading-8 text-slate-300">
                Ke depannya, Sitensi direncanakan memiliki kemampuan
                pengelolaan peserta yang lebih terpusat, pengiriman rekap
                antarakun, dan penggabungan hasil absensi dari beberapa buku.
              </p>
              <p className="mt-4 text-sm leading-7 text-slate-400">
                Fitur-fitur tersebut merupakan bagian dari rencana
                pengembangan Sitensi.
              </p>
            </div>

            <div className="space-y-4">
              {[
                ["01", "Pengiriman rekap antarakun", "Kirim hasil rekap kepada akun Sitensi lain."],
                ["02", "Rekap gabungan", "Gabungkan data kehadiran dari beberapa buku absensi."],
                ["03", "Data peserta terpusat", "Kelola peserta agar dapat digunakan di beberapa buku."],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="text-sm font-bold text-blue-300">{number}</span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Harga */}
      <section id="harga" className="scroll-mt-20 bg-blue-50/60 px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
            Sederhana dan terjangkau
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Kemudahan absensi tidak harus mahal.
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-600">
            Nikmati cara yang lebih praktis dalam mengelola absensi
            dengan biaya berlangganan yang ramah di kantong.
          </p>

          <div className="mx-auto mt-10 max-w-sm rounded-[2rem] border border-blue-100 bg-white p-8 shadow-xl shadow-blue-900/5">
            <p className="text-sm font-semibold text-slate-500">
              Langganan Sitensi
            </p>
            <div className="mt-4 flex items-end justify-center gap-1">
              <span className="mb-1 text-xl font-bold text-slate-700">Rp</span>
              <span className="text-5xl font-bold tracking-tight text-blue-600">
                19.000
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500">per bulan</p>

            <div className="my-7 border-t border-slate-100" />

            <div className="space-y-3 text-left text-sm text-slate-600">
              {[
                "Buat dan kelola buku absensi",
                "Tambahkan dan kelola peserta",
                "Catat kehadiran dengan praktis",
                "Dapatkan rekap otomatis",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <span className="font-bold text-blue-600">✓</span>
                  {item}
                </div>
              ))}
            </div>

            <Link
              href="/login"
              className="mt-8 block rounded-2xl bg-blue-600 px-5 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
            >
              Mulai Gunakan Sitensi
            </Link>
            <p className="mt-4 text-xs text-slate-400">
              Sederhana, praktis, dan terjangkau.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-[2rem] bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-14 text-center text-white shadow-xl shadow-blue-600/20 sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Yuk, buat urusan absensi jadi lebih mudah.
          </h2>
          <p className="mx-auto mt-5 max-w-xl leading-7 text-blue-100">
            Tinggalkan cara yang merepotkan. Mulai kelola buku absensi
            secara digital bersama Sitensi.
          </p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-blue-700 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50"
          >
            Mulai Sekarang
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/icons/icon-192.png"
              alt="Sitensi"
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
            <span className="font-bold">Sitensi</span>
          </Link>

          <p className="text-center text-xs text-slate-400">
            © 2026 Sitensi. Absensi Mudah & Cepat.
          </p>

          <Link
            href="/"
            className="text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            Kembali ke aplikasi →
          </Link>
        </div>
      </footer>
    </main>
  );
}

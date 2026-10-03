# TaskFlow

Papan Kanban React + Vite dengan login, workspace tim, dan penyimpanan MySQL/MariaDB melalui API PHP.

## Login dan workspace

- Register dengan nama, email, dan password minimal 6 karakter, lalu otomatis masuk.
- Login menggunakan email dan password. Session PHP tetap aktif ketika halaman dimuat ulang; tombol Keluar mengakhiri session.
- Setelah masuk, pilih workspace, buat workspace baru, atau gabung dengan kode undangan 8 karakter.
- Satu workspace memiliki satu Kanban Board. Task hanya bisa diakses oleh anggota workspace tersebut.
- Owner dapat mengganti nama/deskripsi, membuat kode undangan baru, dan mengeluarkan member. Owner tidak dapat mengeluarkan dirinya sendiri.
- Member dapat melihat anggota serta menambah, memindahkan, dan menghapus task.
- Setiap workspace memiliki tiga kolom utama serta kolom tambahan dengan pilihan sembilan warna. Kolom dan status task tersimpan di MySQL tanpa localStorage.
- Menghapus kolom tambahan memindahkan task di dalamnya ke To Do pada workspace yang sama; kolom utama tidak dapat dihapus.
- Password disimpan dengan `password_hash`; akses API menggunakan session dan pemeriksaan keanggotaan.

**Akun pertama yang mendaftar** menjadi owner workspace `TaskFlow Hackathon` yang berisi task lama. Akun berikutnya memulai dari daftar workspace kosong. Tidak ada akun/password demo bawaan.

## Kebutuhan

- Node.js 22.12+ dan npm
- XAMPP dengan MySQL/MariaDB aktif, PHP dengan `pdo_mysql` dan `mbstring`

## Persiapan database

Di folder proyek, jalankan:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' -u root -e 'source database/schema.sql'
npm run db:migrate
& 'C:\xampp\mysql\bin\mysql.exe' -u root -e 'source database/seed.sql'
```

`schema.sql` membuat database dan tabel. Migrasi menambahkan `users`, `workspaces`, `workspace_members`, serta `workspace_id` dan `created_by` pada task lama. Migrasi juga mengubah status task menjadi VARCHAR dan memindahkan kolom global lama ke workspace awal. Kolom baru menggunakan ID gabungan workspace/kolom. Migrasi mempertahankan akun, workspace, task, warna kolom, dan dapat dijalankan ulang. Jika database `taskflow` sudah ada, cukup jalankan `npm run db:migrate`. Pada workspace ini, migrasi sudah dijalankan dan delapan task yang ada dipertahankan.

`seed.sql` opsional untuk mengisi tujuh task contoh pada workspace awal dan aman dijalankan ulang setelah migrasi. Konfigurasi API memakai `127.0.0.1:3306`, pengguna `root`, dan kata sandi kosong sesuai XAMPP standar. Jika berbeda, set variabel lingkungan `TASKFLOW_DB_HOST`, `TASKFLOW_DB_PORT`, `TASKFLOW_DB_NAME`, `TASKFLOW_DB_USER`, dan `TASKFLOW_DB_PASSWORD` sebelum menjalankan PHP. Di sistem selain Windows, migrasi dapat dijalankan dengan `php database/migrate.php`.

## Menjalankan aplikasi

Jalankan dua terminal dari folder proyek:

```powershell
# Terminal 1: API PHP
& 'C:\xampp\php\php.exe' -S 127.0.0.1:8000 -t .
```

```powershell
# Terminal 2: frontend
npm ci
npm run dev
```

Buka http://localhost:5173. Vite meneruskan permintaan `/api` ke server PHP lokal pada port 8000. Data task tersimpan di MySQL sehingga tetap ada setelah halaman dimuat ulang. Kedua server perlu tetap berjalan selama aplikasi digunakan.

Gunakan tombol **Daftar sekarang** untuk membuat akun pertama. Untuk mencoba kolaborasi dengan akun lain, gunakan browser atau jendela incognito berbeda, lalu bagikan kode dari **Anggota & pengaturan**. Daftar workspace bisa dibuka lewat logo TaskFlow atau tombol Semua workspace.

## Pemeriksaan

```powershell
npm run lint
npm run build
npm test
```

`npm test` membuat database sementara dengan awalan `taskflow_test_`, menjalankan server pengujian pada port 8001 dan 5174, lalu menghapus database tersebut ketika selesai. Database `taskflow` tidak dipakai untuk pengujian. MySQL harus aktif dan akun koneksi perlu dapat membuat database sementara. Jika Edge tidak tersedia, jalankan `npx playwright install chromium` sekali. Gunakan `TASKFLOW_PHP` bila executable PHP berada di lokasi lain.

Pengujian mencakup register/login/logout, persistensi session dan task, buat/gabung workspace, drag-and-drop, kode undangan, hak owner, akses antar-workspace, kegagalan penyimpanan, keyboard, tampilan mobile, kolom custom, warna, isolasi kolom, serta migrasi dari struktur database repo terbaru.

## Struktur utama

- `src/components/AuthScreen.jsx`: form login/register.
- `src/components/WorkspaceShell.jsx`: daftar dan navigasi workspace.
- `src/components/WorkspaceForm.jsx`: form buat/gabung.
- `src/components/WorkspaceSettings.jsx`: kode undangan, pengaturan, dan anggota.
- `src/components/WorkspaceBoard.jsx`: board yang menggunakan ID workspace aktif.
- `src/api/`: client fetch, API akun, workspace, task, dan kolom.
- `api/auth.php`, `api/workspaces.php`, `api/tasks.php`, `api/columns.php`: endpoint PHP.
- `api/bootstrap.php`, `api/lib/database.php`: session, akses anggota, dan koneksi PDO.
- `database/migrate.php`: migrasi data lama; `schema.sql` dan `seed.sql`: struktur dan data contoh.

## API

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/auth.php` | User session aktif atau `null` |
| `POST /api/auth.php?action=register\|login\|logout` | Akun dan session |
| `GET /api/workspaces.php` | Workspace milik/diikuti user |
| `POST /api/workspaces.php` | Buat workspace |
| `POST /api/workspaces.php?action=join` | Gabung dengan `invite_code` |
| `GET /api/workspaces.php?id=<id>&action=members` | Daftar anggota |
| `PATCH /api/workspaces.php?id=<id>` | Ubah nama/deskripsi (owner) |
| `PATCH /api/workspaces.php?id=<id>&action=invite` | Kode undangan baru (owner) |
| `DELETE /api/workspaces.php?id=<id>&action=member&user_id=<id>` | Keluarkan member (owner) |
| `GET\|POST /api/tasks.php?workspace_id=<id>` | Daftar/tambah task |
| `PATCH\|DELETE /api/tasks.php?workspace_id=<id>&id=<task-id>` | Pindah/hapus task |

| `GET\|POST /api/columns.php?workspace_id=<id>` | Daftar/tambah kolom workspace |
| `DELETE /api/columns.php?workspace_id=<id>&id=<column-id>` | Hapus kolom tambahan dan pindahkan task ke To Do |

## Urutan kolom

Tarik judul/ikon pegangan kolom dan lepaskan sebelum atau sesudah kolom tujuan. Garis ungu menunjukkan posisi sisipan. Dengan keyboard, fokuskan judul dan gunakan tombol panah. Urutan disimpan per workspace melalui `PATCH /api/columns.php?workspace_id=<id>` dengan payload `{ "column_ids": ["todo", "in_progress", "review", "done"] }` yang mencakup semua ID kolom workspace. Login dan keanggotaan workspace wajib; backend harus aktif. Drag sentuh mengikuti dukungan browser.

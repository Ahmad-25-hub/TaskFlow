# TaskFlow

Papan Kanban React + Vite dengan penyimpanan MySQL/MariaDB melalui API PHP.

## Kebutuhan

- Node.js 22.12+ dan npm
- XAMPP dengan MySQL/MariaDB aktif, PHP dengan `pdo_mysql` dan `mbstring`

## Persiapan database

Di folder proyek, jalankan:

```powershell
& 'C:\xampp\mysql\bin\mysql.exe' -u root -e 'source database/schema.sql'
& 'C:\xampp\mysql\bin\mysql.exe' -u root -e 'source database/seed.sql'
```

`schema.sql` membuat database `taskflow`, tabel `columns`, dan tabel `tasks`. `seed.sql` mengisi tiga kolom standar (To Do, In Progress, Done) dan tujuh task contoh. Konfigurasi API memakai `127.0.0.1:3306`, pengguna `root`, dan kata sandi kosong sesuai XAMPP standar. Jika berbeda, set variabel lingkungan `TASKFLOW_DB_HOST`, `TASKFLOW_DB_PORT`, `TASKFLOW_DB_NAME`, `TASKFLOW_DB_USER`, dan `TASKFLOW_DB_PASSWORD` sebelum menjalankan PHP.

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

Buka http://localhost:5173. Vite meneruskan permintaan `/api` ke server PHP lokal pada port 8000. Data task dan kolom tersimpan di MySQL sehingga tetap ada setelah halaman dimuat ulang. Kedua server perlu tetap berjalan selama aplikasi digunakan.

## Pemeriksaan

```powershell
npm run lint
npm run build
npm test
```

API mendukung:
- Task: `GET /api/tasks.php`, `POST /api/tasks.php`, `PATCH /api/tasks.php?id=<uuid>`, dan `DELETE /api/tasks.php?id=<uuid>`.
- Kolom: `GET /api/columns.php`, `POST /api/columns.php`, `PATCH /api/columns.php`, dan `DELETE /api/columns.php?id=<id>`.

Tarik judul/ikon pegangan kolom lalu lepaskan di sisi sebelum atau sesudah kolom tujuan untuk mengatur urutan. Garis ungu menunjukkan posisi sisipan. Dengan keyboard, fokuskan judul kolom lalu gunakan tombol panah. Drag kolom memakai HTML Drag and Drop pada browser desktop; dukungan sentuhan mengikuti browser. Kolom tambahan dapat disisipkan di antara kolom utama dengan menggesernya. Urutan disimpan melalui PATCH dengan payload `{ "column_ids": ["todo", "in_progress", "review", "done"] }` (sertakan semua ID kolom yang ada). Ketika backend tidak tersedia, urutan disimpan di localStorage dan digunakan selama backend tetap tidak tersedia; urutan database kembali digunakan saat backend aktif. Tiga kolom utama tetap tidak dapat dihapus dan makna statusnya tidak berubah saat dipindahkan.


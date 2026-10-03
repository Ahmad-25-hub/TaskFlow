# TaskFlow — Sesi 1

## Tim ilkomerz24

**Anggota Tim:**
- Muhammad
- Ahmad

Frontend Kanban Board untuk hackathon, menggunakan React, Vite, JavaScript, dan Tailwind CSS. Ikon menggunakan Lucide React.

## Menjalankan project

Gunakan Node.js 22.12+ (atau Node.js 24) dan npm.

```sh
npm install
npm run dev
```

Buka URL yang ditampilkan Vite, biasanya http://localhost:5173.

```sh
npm run lint
npm run build
npm run preview
```

`build` menghasilkan folder `dist`; `preview` menampilkan hasil build secara lokal. XAMPP belum diperlukan untuk sesi ini.

## Pengujian browser

```sh
npm test
```

Pengujian memakai Edge yang sudah terpasang di Windows. Jika Edge tidak tersedia, jalankan `npx playwright install chromium` sekali sebelum `npm test`. Pengujian mencakup data dummy, tambah/hapus task, validasi, perpindahan status, drag-and-drop, pencarian/filter, navigasi keyboard modal, dan layar kecil. Playwright menyalakan Vite otomatis saat pengujian.

## Struktur

```text
src/
  components/
    Navbar.jsx          # Header aplikasi
    KanbanBoard.jsx     # Pembagian task dan koordinasi drag-and-drop
    KanbanColumn.jsx    # Kolom, jumlah task, dan tampilan kosong
    TaskCard.jsx        # Kartu task, hapus, dan pilihan status
    AddTaskModal.jsx    # Form tambah dengan validasi dan navigasi keyboard
  data/
    tasks.js            # Definisi status dan tujuh task dummy
  App.jsx               # React state, tambah/hapus/pindah, pencarian dan filter
  index.css             # Tailwind dan gaya komponen
  main.jsx              # Entry React
```

## Fitur

- Tiga kolom: To Do, In Progress, Done.
- Tambah task dari toolbar atau masing-masing kolom.
- Judul wajib diisi (maksimal 120 karakter), deskripsi opsional (maksimal 1.000 karakter).
- Hapus task lewat ikon tempat sampah.
- Pindahkan task dengan drag-and-drop pada desktop atau pilihan status pada kartu, termasuk di ponsel.
- Cari berdasarkan judul/deskripsi dan filter berdasarkan status.
- Jumlah task dan persentase selesai mengikuti React state.
- Tampilan responsif; form dapat ditutup dengan Escape dan fokus keyboard tetap di dalam modal.
- Data hanya berada di memori. Reload halaman mengembalikan data dummy.

## Model task

```js
{
  id: 'uuid',
  title: 'Judul task',
  description: 'Deskripsi task',
  status: 'todo', // todo | in_progress | done
  created_at: '2026-10-03T02:00:00.000Z'
}
```

Task baru memakai `crypto.randomUUID()` dan timestamp ISO. Tanggal ditampilkan dalam zona waktu Asia/Jakarta. Perubahan data dilakukan di `App.jsx`, sehingga sumber data dapat diganti dengan API pada sesi berikutnya.

Sesi ini tidak menggunakan localStorage dan belum berisi backend PHP, database MySQL, login, atau integrasi phpMyAdmin.

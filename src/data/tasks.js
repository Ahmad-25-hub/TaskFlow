export const TASK_STATUSES = [
  { id: 'todo', label: 'To Do', description: 'Ide yang siap dikerjakan', color: 'indigo' },
  { id: 'in_progress', label: 'In Progress', description: 'Sedang dibawa jadi nyata', color: 'amber' },
  { id: 'done', label: 'Done', description: 'Satu langkah lebih dekat', color: 'emerald' },
]

// Data sementara untuk sesi frontend; sumber data dapat diganti dengan API nanti.
export const initialTasks = [
  { id: 'task-001', title: 'Rancang landing page', description: 'Buat wireframe halaman utama yang memperkenalkan produk dan manfaatnya dengan jelas.', status: 'todo', created_at: '2026-10-01T08:00:00+07:00' },
  { id: 'task-002', title: 'Eksplorasi palet warna', description: 'Cari kombinasi warna yang fresh, nyaman di mata, dan sesuai dengan karakter produk.', status: 'todo', created_at: '2026-10-02T09:00:00+07:00' },
  { id: 'task-003', title: 'Siapkan alur demo', description: 'Susun cerita singkat untuk menunjukkan masalah, solusi, dan fitur utama ke juri.', status: 'todo', created_at: '2026-10-03T08:30:00+07:00' },
  { id: 'task-004', title: 'Bangun komponen Kanban', description: 'Implementasikan board, kolom, dan kartu task yang bisa digunakan kembali.', status: 'in_progress', created_at: '2026-10-02T10:00:00+07:00' },
  { id: 'task-005', title: 'Desain tampilan mobile', description: 'Pastikan setiap kartu dan form nyaman digunakan di layar kecil.', status: 'in_progress', created_at: '2026-10-03T09:00:00+07:00' },
  { id: 'task-006', title: 'Tentukan konsep project', description: 'Sepakati ide, tujuan, dan fitur inti untuk versi pertama TaskFlow.', status: 'done', created_at: '2026-10-01T07:00:00+07:00' },
  { id: 'task-007', title: 'Siapkan workspace', description: 'Hubungkan repository dan siapkan struktur aplikasi untuk mulai berkolaborasi.', status: 'done', created_at: '2026-10-01T09:30:00+07:00' },
]

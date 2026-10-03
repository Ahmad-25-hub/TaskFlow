USE taskflow;

INSERT IGNORE INTO tasks (id, title, description, status, created_at) VALUES
('00000000-0000-4000-8000-000000000001', 'Rancang landing page', 'Buat wireframe halaman utama yang memperkenalkan produk dan manfaatnya dengan jelas.', 'todo', '2026-10-01 01:00:00.000'),
('00000000-0000-4000-8000-000000000002', 'Eksplorasi palet warna', 'Cari kombinasi warna yang fresh, nyaman di mata, dan sesuai dengan karakter produk.', 'todo', '2026-10-02 02:00:00.000'),
('00000000-0000-4000-8000-000000000003', 'Siapkan alur demo', 'Susun cerita singkat untuk menunjukkan masalah, solusi, dan fitur utama ke juri.', 'todo', '2026-10-03 01:30:00.000'),
('00000000-0000-4000-8000-000000000004', 'Bangun komponen Kanban', 'Implementasikan board, kolom, dan kartu task yang bisa digunakan kembali.', 'in_progress', '2026-10-02 03:00:00.000'),
('00000000-0000-4000-8000-000000000005', 'Desain tampilan mobile', 'Pastikan setiap kartu dan form nyaman digunakan di layar kecil.', 'in_progress', '2026-10-03 02:00:00.000'),
('00000000-0000-4000-8000-000000000006', 'Tentukan konsep project', 'Sepakati ide, tujuan, dan fitur inti untuk versi pertama TaskFlow.', 'done', '2026-10-01 00:00:00.000'),
('00000000-0000-4000-8000-000000000007', 'Siapkan workspace', 'Hubungkan repository dan siapkan struktur aplikasi untuk mulai berkolaborasi.', 'done', '2026-10-01 02:30:00.000');

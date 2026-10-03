<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/api/lib/database.php';
$name = getenv('TASKFLOW_DB_NAME') ?: '';
if (!preg_match('/^taskflow_test_[a-z0-9_]+$/', $name)) throw new RuntimeException('Database pengujian wajib terpisah.');
$connection = database(false);
$connection->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
try {
    $db = database();
    // Existing repository structure before workspace migration.
    $db->exec("CREATE TABLE columns (id VARCHAR(50) PRIMARY KEY, label VARCHAR(50) NOT NULL, description VARCHAR(255) NOT NULL DEFAULT '', color VARCHAR(30) NOT NULL DEFAULT 'indigo', sort_order INT NOT NULL DEFAULT 0, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB");
    $db->exec("CREATE TABLE tasks (id CHAR(36) PRIMARY KEY, title VARCHAR(120) NOT NULL, description TEXT NOT NULL, status VARCHAR(50) NOT NULL DEFAULT 'todo', created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB");
    $db->exec("INSERT INTO columns (id, label, color, sort_order) VALUES ('review', 'Review Lama', 'rose', 4)");
    $db->exec("INSERT INTO tasks (id, title, description, status) VALUES ('00000000-0000-4000-8000-000000000001', 'Task lama', '', 'review'), ('00000000-0000-4000-8000-000000000002', 'Status tanpa kolom', '', 'backlog')");
    require dirname(__DIR__) . '/database/migrate.php';
    require dirname(__DIR__) . '/database/migrate.php';
    if ((int) $db->query('SELECT COUNT(*) FROM tasks')->fetchColumn() !== 2) throw new RuntimeException('Task lama berubah.');
    if ((int) $db->query('SELECT COUNT(*) FROM columns')->fetchColumn() !== 5) throw new RuntimeException('Kolom migrasi tidak lengkap atau duplikat.');
    if ($db->query("SELECT color FROM columns WHERE id = 'review'")->fetchColumn() !== 'rose') throw new RuntimeException('Warna kolom lama berubah.');
    if ((int) $db->query('SELECT COUNT(*) FROM tasks t JOIN columns c ON c.workspace_id = t.workspace_id AND c.id = t.status')->fetchColumn() !== 2) throw new RuntimeException('Task hilang dari papan.');
    echo "Pengujian migrasi lama dan migrasi berulang berhasil.\n";
} finally {
    $connection->exec("DROP DATABASE `$name`");
}

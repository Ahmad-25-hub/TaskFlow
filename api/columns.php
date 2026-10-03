<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function columnRow(array $row): array {
    return [
        'id' => (string)$row['id'],
        'label' => (string)$row['label'],
        'description' => (string)($row['description'] ?? ''),
        'color' => (string)($row['color'] ?? 'indigo'),
        'sort_order' => (int)($row['sort_order'] ?? 0),
    ];
}

function payload(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) respond(400, ['error' => 'JSON tidak valid.']);
    return $data;
}

function slugify(string $text): string {
    $text = preg_replace('~[^\pL\d]+~u', '_', $text);
    $text = trim($text, '_');
    $text = strtolower($text);
    return preg_replace('~[^a-z0-9_]~', '', $text) ?: 'col';
}

try {
    $host = getenv('TASKFLOW_DB_HOST') ?: '127.0.0.1';
    $port = getenv('TASKFLOW_DB_PORT') ?: '3306';
    $name = getenv('TASKFLOW_DB_NAME') ?: 'taskflow';
    $user = getenv('TASKFLOW_DB_USER') ?: 'root';
    $password = getenv('TASKFLOW_DB_PASSWORD') ?: '';
    $db = new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4", $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $db->exec("SET time_zone = '+00:00'");

    // Pastikan tabel columns selalu siap digunakan
    $db->exec("
        CREATE TABLE IF NOT EXISTS columns (
            id VARCHAR(50) NOT NULL PRIMARY KEY,
            label VARCHAR(50) NOT NULL,
            description VARCHAR(255) NOT NULL DEFAULT '',
            color VARCHAR(30) NOT NULL DEFAULT 'indigo',
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    $count = (int)$db->query('SELECT COUNT(*) FROM columns')->fetchColumn();
    if ($count === 0) {
        $db->exec("
            INSERT IGNORE INTO columns (id, label, description, color, sort_order) VALUES
            ('todo', 'To Do', 'Ide yang siap dikerjakan', 'indigo', 1),
            ('in_progress', 'In Progress', 'Sedang dibawa jadi nyata', 'amber', 2),
            ('done', 'Done', 'Satu langkah lebih dekat', 'emerald', 3);
        ");
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $id = $_GET['id'] ?? null;

    if ($method === 'GET' && $id === null) {
        $rows = $db->query('SELECT id, label, description, color, sort_order FROM columns ORDER BY sort_order ASC, created_at ASC')->fetchAll();
        respond(200, ['columns' => array_map('columnRow', $rows)]);
    }

    if ($method === 'PATCH' && $id === null) {
        $data = payload();
        $ids = $data['column_ids'] ?? null;
        if (!is_array($ids) || !array_is_list($ids) || count($ids) === 0 ||
            count(array_filter($ids, 'is_string')) !== count($ids) ||
            count(array_unique($ids)) !== count($ids)) {
            respond(422, ['error' => 'Urutan harus berisi semua ID kolom tanpa duplikat.']);
        }

        $db->beginTransaction();
        $existing = $db->query('SELECT id FROM columns ORDER BY id FOR UPDATE')->fetchAll(PDO::FETCH_COLUMN);
        $sortedIds = $ids;
        sort($sortedIds, SORT_STRING);
        sort($existing, SORT_STRING);
        if ($sortedIds !== $existing) {
            $db->rollBack();
            respond(422, ['error' => 'Daftar kolom berubah. Muat ulang halaman sebelum mengatur urutan.']);
        }
        $update = $db->prepare('UPDATE columns SET sort_order = ? WHERE id = ?');
        foreach ($ids as $index => $columnId) {
            $update->execute([$index + 1, $columnId]);
        }
        $rows = $db->query('SELECT id, label, description, color, sort_order FROM columns ORDER BY sort_order ASC, created_at ASC')->fetchAll();
        $db->commit();
        respond(200, ['columns' => array_map('columnRow', $rows)]);
    }

    if ($method === 'POST' && $id === null) {
        $data = payload();
        $label = trim((string)($data['label'] ?? ''));
        $description = trim((string)($data['description'] ?? ''));
        $color = trim((string)($data['color'] ?? 'indigo'));

        if ($label === '' || mb_strlen($label) > 50 || mb_strlen($description) > 255 || mb_strlen($color) > 30) {
            respond(422, ['error' => 'Data kolom tidak valid. Label maksimal 50 karakter.']);
        }

        $baseId = !empty($data['id']) ? trim((string)$data['id']) : slugify($label);
        $colId = substr($baseId, 0, 40);

        // Periksa apakah ID sudah terpakai
        $checkStmt = $db->prepare('SELECT COUNT(*) FROM columns WHERE id = ?');
        $checkStmt->execute([$colId]);
        if ((int)$checkStmt->fetchColumn() > 0) {
            $colId = substr($colId, 0, 34) . '_' . substr(bin2hex(random_bytes(3)), 0, 5);
        }

        $maxOrderStmt = $db->query('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM columns');
        $sortOrder = (int)$maxOrderStmt->fetchColumn();

        $stmt = $db->prepare('INSERT INTO columns (id, label, description, color, sort_order) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$colId, $label, $description, $color, $sortOrder]);

        $fetchStmt = $db->prepare('SELECT id, label, description, color, sort_order FROM columns WHERE id = ?');
        $fetchStmt->execute([$colId]);
        respond(201, ['column' => columnRow($fetchStmt->fetch())]);
    }

    if ($method === 'DELETE' && $id !== null) {
        $colId = trim((string)$id);
        if (in_array($colId, ['todo', 'in_progress', 'done'], true)) {
            respond(400, ['error' => 'Kolom bawaan tidak dapat dihapus.']);
        }

        // Pindahkan task yang ada di kolom ini kembali ke todo agar tidak hilang
        $moveStmt = $db->prepare("UPDATE tasks SET status = 'todo' WHERE status = ?");
        $moveStmt->execute([$colId]);

        $delStmt = $db->prepare('DELETE FROM columns WHERE id = ?');
        $delStmt->execute([$colId]);
        if (!$delStmt->rowCount()) {
            respond(404, ['error' => 'Kolom tidak ditemukan.']);
        }

        respond(200, ['deleted' => true, 'id' => $colId]);
    }

    respond(405, ['error' => 'Metode tidak didukung.']);
} catch (PDOException $error) {
    if (isset($db) && $db->inTransaction()) $db->rollBack();
    error_log($error->getMessage());
    respond(500, ['error' => 'Koneksi atau operasi database gagal.']);
}

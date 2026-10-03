<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(int $status, array $body): never {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function taskRow(array $row): array {
    return [
        'id' => $row['id'],
        'title' => $row['title'],
        'description' => $row['description'],
        'status' => $row['status'],
        'created_at' => (new DateTimeImmutable($row['created_at'], new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z'),
    ];
}

function payload(): array {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) respond(400, ['error' => 'JSON tidak valid.']);
    return $data;
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

    $method = $_SERVER['REQUEST_METHOD'];
    $id = $_GET['id'] ?? null;
    if ($method === 'GET' && $id === null) {
        $rows = $db->query('SELECT id, title, description, status, created_at FROM tasks ORDER BY created_at DESC, id DESC')->fetchAll();
        respond(200, ['tasks' => array_map('taskRow', $rows)]);
    }
    if ($method === 'POST' && $id === null) {
        $data = payload();
        $title = trim((string)($data['title'] ?? ''));
        $description = trim((string)($data['description'] ?? ''));
        $status = $data['status'] ?? 'todo';
        if ($title === '' || mb_strlen($title) > 120 || mb_strlen($description) > 1000 || !in_array($status, ['todo', 'in_progress', 'done'], true)) {
            respond(422, ['error' => 'Data task tidak valid.']);
        }
        $id = bin2hex(random_bytes(16));
        $id = substr($id, 0, 8) . '-' . substr($id, 8, 4) . '-' . substr($id, 12, 4) . '-' . substr($id, 16, 4) . '-' . substr($id, 20);
        $stmt = $db->prepare('INSERT INTO tasks (id, title, description, status) VALUES (?, ?, ?, ?)');
        $stmt->execute([$id, $title, $description, $status]);
        $stmt = $db->prepare('SELECT id, title, description, status, created_at FROM tasks WHERE id = ?');
        $stmt->execute([$id]);
        respond(201, ['task' => taskRow($stmt->fetch())]);
    }
    if ($id !== null && !preg_match('/^[a-f0-9-]{36}$/i', $id)) respond(400, ['error' => 'ID task tidak valid.']);
    if ($method === 'PATCH' && $id !== null) {
        $data = payload();
        $status = $data['status'] ?? null;
        if (!in_array($status, ['todo', 'in_progress', 'done'], true)) respond(422, ['error' => 'Status tidak valid.']);
        $stmt = $db->prepare('UPDATE tasks SET status = ? WHERE id = ?');
        $stmt->execute([$status, $id]);
        if (!$stmt->rowCount()) {
            $check = $db->prepare('SELECT id FROM tasks WHERE id = ?');
            $check->execute([$id]);
            if (!$check->fetch()) respond(404, ['error' => 'Task tidak ditemukan.']);
        }
        respond(200, ['status' => $status]);
    }
    if ($method === 'DELETE' && $id !== null) {
        $stmt = $db->prepare('DELETE FROM tasks WHERE id = ?');
        $stmt->execute([$id]);
        if (!$stmt->rowCount()) respond(404, ['error' => 'Task tidak ditemukan.']);
        respond(200, ['deleted' => true]);
    }
    respond(405, ['error' => 'Metode tidak didukung.']);
} catch (PDOException $error) {
    error_log($error->getMessage());
    respond(500, ['error' => 'Koneksi atau operasi database gagal.']);
}

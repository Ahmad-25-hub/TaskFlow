<?php
require __DIR__ . '/bootstrap.php';
$db = database();
$user = requireUser($db);
$workspaceId = $_GET['workspace_id'] ?? '';
if (!is_string($workspaceId)) respond(422, ['error' => 'Workspace tidak valid.']);
workspaceAccess($db, $workspaceId, $user['id']);
$method = $_SERVER['REQUEST_METHOD'];
if (in_array($method, ['POST', 'PATCH', 'DELETE'], true)) {
    $db->beginTransaction();
    $db->prepare('SELECT id FROM workspaces WHERE id = ? FOR UPDATE')->execute([$workspaceId]);
    workspaceAccess($db, $workspaceId, $user['id']);
}
$id = $_GET['id'] ?? null;

function deadlineValue($value): ?string {
    if ($value === null || $value === '') return null;
    if (!is_string($value) || !preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $value)) respond(422, ['error' => 'Deadline harus berupa tanggal YYYY-MM-DD.']);
    [$year, $month, $day] = array_map('intval', explode('-', $value));
    if ($year < 1000 || !checkdate($month, $day, $year)) respond(422, ['error' => 'Tanggal deadline tidak valid.']);
    return $value;
}
function taskRow(array $row): array {
    $row['created_at'] = (new DateTimeImmutable($row['created_at'], new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
    return $row;
}
function findTask(PDO $db, string $id, string $workspaceId): array {
    $stmt = $db->prepare('SELECT * FROM tasks WHERE id = ? AND workspace_id = ?');
    $stmt->execute([$id, $workspaceId]);
    $task = $stmt->fetch();
    if (!$task) respond(404, ['error' => 'Task tidak ditemukan di workspace ini.']);
    return taskRow($task);
}
if ($method === 'GET' && $id === null) {
    $stmt = $db->prepare('SELECT * FROM tasks WHERE workspace_id = ? ORDER BY created_at DESC, id DESC');
    $stmt->execute([$workspaceId]);
    respond(200, ['tasks' => array_map('taskRow', $stmt->fetchAll())]);
}
if ($method === 'POST' && $id === null) {
    $data = payload();
    $title = textField($data, 'title', 1, 120);
    $description = textField($data, 'description', 0, 1000);
    $status = $data['status'] ?? 'todo';
    validateTaskColumn($db, $workspaceId, $status);
    $deadline = deadlineValue($data['deadline'] ?? null);
    $id = uuid();
    $db->prepare('INSERT INTO tasks (id, title, description, status, workspace_id, created_by, deadline) VALUES (?, ?, ?, ?, ?, ?, ?)')->execute([$id, $title, $description, $status, $workspaceId, $user['id'], $deadline]);
    $db->commit();
    respond(201, ['task' => findTask($db, $id, $workspaceId)]);
}
if (!is_string($id) || !preg_match('/^[a-f0-9-]{36}$/i', $id)) respond(400, ['error' => 'ID task tidak valid.']);
findTask($db, $id, $workspaceId);
if ($method === 'PATCH') {
    $data = payload();
    $updates = [];
    $values = [];
    foreach (['title' => [1, 120], 'description' => [0, 1000]] as $field => $limits) {
        if (array_key_exists($field, $data)) {
            if (!is_string($data[$field])) respond(422, ['error' => 'Judul dan deskripsi harus berupa teks.']);
            $updates[] = $field . ' = ?';
            $values[] = textField($data, $field, $limits[0], $limits[1]);
        }
    }
    if (array_key_exists('status', $data)) {
        validateTaskColumn($db, $workspaceId, $data['status']);
        $updates[] = 'status = ?';
        $values[] = $data['status'];
    }
    if (array_key_exists('deadline', $data)) {
        $updates[] = 'deadline = ?';
        $values[] = deadlineValue($data['deadline']);
    }
    if (!$updates) respond(422, ['error' => 'Isi judul, deskripsi, status, atau deadline yang ingin diubah.']);
    $db->prepare('UPDATE tasks SET ' . implode(', ', $updates) . ' WHERE id = ? AND workspace_id = ?')->execute(array_merge($values, [$id, $workspaceId]));
    $db->commit();
    respond(200, ['task' => findTask($db, $id, $workspaceId)]);
}
if ($method === 'DELETE') {
    $db->prepare('DELETE FROM tasks WHERE id = ? AND workspace_id = ?')->execute([$id, $workspaceId]);
    $db->commit();
    respond(200, ['deleted' => true]);
}
respond(405, ['error' => 'Metode tidak didukung.']);

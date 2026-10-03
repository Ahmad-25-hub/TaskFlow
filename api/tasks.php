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
    $id = uuid();
    $db->prepare('INSERT INTO tasks (id, title, description, status, workspace_id, created_by) VALUES (?, ?, ?, ?, ?, ?)')->execute([$id, $title, $description, $status, $workspaceId, $user['id']]);
    $db->commit();
    respond(201, ['task' => findTask($db, $id, $workspaceId)]);
}
if (!is_string($id) || !preg_match('/^[a-f0-9-]{36}$/i', $id)) respond(400, ['error' => 'ID task tidak valid.']);
findTask($db, $id, $workspaceId);
if ($method === 'PATCH') {
    $data = payload();
    $status = $data['status'] ?? null;
    validateTaskColumn($db, $workspaceId, $status);
    $db->prepare('UPDATE tasks SET status = ? WHERE id = ? AND workspace_id = ?')->execute([$status, $id, $workspaceId]);
    $db->commit();
    respond(200, ['task' => findTask($db, $id, $workspaceId)]);
}
if ($method === 'DELETE') {
    $db->prepare('DELETE FROM tasks WHERE id = ? AND workspace_id = ?')->execute([$id, $workspaceId]);
    $db->commit();
    respond(200, ['deleted' => true]);
}
respond(405, ['error' => 'Metode tidak didukung.']);

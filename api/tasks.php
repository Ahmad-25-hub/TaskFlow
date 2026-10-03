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

require_once __DIR__ . '/lib/tasks.php';
if ($method === 'GET' && $id === null) {
    $stmt = $db->prepare('SELECT t.*, creator.name AS creator_name, completer.name AS completer_name FROM tasks t LEFT JOIN users creator ON creator.id = t.created_by LEFT JOIN users completer ON completer.id = t.completed_by WHERE t.workspace_id = ? ORDER BY t.created_at DESC, t.id DESC');
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
    $db->prepare('INSERT INTO tasks (id, title, description, status, workspace_id, created_by, deadline, completed_by, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')->execute([$id, $title, $description, $status, $workspaceId, $user['id'], $deadline, $status === 'done' ? $user['id'] : null, $status === 'done' ? gmdate('Y-m-d H:i:s') : null]);
    $db->commit();
    respond(201, ['task' => findTask($db, $id, $workspaceId)]);
}
if (!is_string($id) || !preg_match('/^[a-f0-9-]{36}$/i', $id)) respond(400, ['error' => 'ID task tidak valid.']);
$existingTask = findTask($db, $id, $workspaceId);
if ($method === 'PATCH') {
    $data = payload();
    $changes = taskChanges($db, $workspaceId, $existingTask, $data, $user['id']);
    $db->prepare('UPDATE tasks SET ' . implode(', ', $changes['updates']) . ' WHERE id = ? AND workspace_id = ?')->execute(array_merge($changes['values'], [$id, $workspaceId]));
    $db->commit();
    respond(200, ['task' => findTask($db, $id, $workspaceId)]);
}
if ($method === 'DELETE') {
    $db->prepare('DELETE FROM tasks WHERE id = ? AND workspace_id = ?')->execute([$id, $workspaceId]);
    $db->commit();
    respond(200, ['deleted' => true]);
}
respond(405, ['error' => 'Metode tidak didukung.']);

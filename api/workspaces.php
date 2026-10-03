<?php
require __DIR__ . '/bootstrap.php';
$db = database();
$user = requireUser($db);
$method = $_SERVER['REQUEST_METHOD'];
$id = $_GET['id'] ?? '';
$action = $_GET['action'] ?? '';

function workspaceResult(PDO $db, string $id, string $userId): array {
    $workspace = workspaceAccess($db, $id, $userId);
    $stmt = $db->prepare('SELECT COUNT(*) FROM workspace_members WHERE workspace_id = ?');
    $stmt->execute([$id]);
    $workspace['member_count'] = (int) $stmt->fetchColumn();
    return $workspace;
}

if ($method === 'GET' && $id === '') {
    $stmt = $db->prepare('SELECT w.*, IF(w.owner_id = m.user_id, \'owner\', \'member\') AS role, (SELECT COUNT(*) FROM workspace_members members WHERE members.workspace_id = w.id) AS member_count, (SELECT COUNT(*) FROM tasks t WHERE t.workspace_id = w.id) AS task_count FROM workspaces w JOIN workspace_members m ON m.workspace_id = w.id WHERE m.user_id = ? ORDER BY w.created_at DESC, w.id');
    $stmt->execute([$user['id']]);
    respond(200, ['workspaces' => $stmt->fetchAll()]);
}
if ($method === 'GET' && $action === 'members') {
    workspaceAccess($db, $id, $user['id']);
    $stmt = $db->prepare('SELECT u.id, u.name, u.email, IF(w.owner_id = u.id, \'owner\', \'member\') AS role FROM workspace_members m JOIN users u ON u.id = m.user_id JOIN workspaces w ON w.id = m.workspace_id WHERE m.workspace_id = ? ORDER BY role DESC, u.name');
    $stmt->execute([$id]);
    respond(200, ['members' => $stmt->fetchAll()]);
}
if ($method === 'POST' && $action === 'join') {
    $data = payload();
    $code = strtoupper(textField($data, 'invite_code', 8, 8));
    $stmt = $db->prepare('SELECT id FROM workspaces WHERE invite_code = ?');
    $stmt->execute([$code]);
    $workspaceId = $stmt->fetchColumn();
    if (!$workspaceId) respond(404, ['error' => 'Kode undangan tidak ditemukan.']);
    $db->prepare('INSERT IGNORE INTO workspace_members (workspace_id, user_id) VALUES (?, ?)')->execute([$workspaceId, $user['id']]);
    respond(200, ['workspace' => workspaceResult($db, $workspaceId, $user['id'])]);
}
if ($method === 'POST' && $action === '') {
    $data = payload();
    $id = uuid();
    $name = textField($data, 'name', 2, 80);
    $description = textField($data, 'description', 0, 300);
    $db->beginTransaction();
    $db->prepare('INSERT INTO workspaces (id, name, description, owner_id, invite_code) VALUES (?, ?, ?, ?, ?)')->execute([$id, $name, $description, $user['id'], strtoupper(bin2hex(random_bytes(4)))]);
    $db->prepare('INSERT INTO workspace_members (workspace_id, user_id) VALUES (?, ?)')->execute([$id, $user['id']]);
    seedDefaultColumns($db, $id);
    $db->commit();
    respond(201, ['workspace' => workspaceResult($db, $id, $user['id'])]);
}
if ($method === 'PATCH') {
    workspaceAccess($db, $id, $user['id'], true);
    if ($action === 'invite') {
        $db->prepare('UPDATE workspaces SET invite_code = ? WHERE id = ?')->execute([strtoupper(bin2hex(random_bytes(4))), $id]);
    } else {
        $data = payload();
        $db->prepare('UPDATE workspaces SET name = ?, description = ? WHERE id = ?')->execute([textField($data, 'name', 2, 80), textField($data, 'description', 0, 300), $id]);
    }
    respond(200, ['workspace' => workspaceResult($db, $id, $user['id'])]);
}
if ($method === 'DELETE' && $action === 'member') {
    $workspace = workspaceAccess($db, $id, $user['id'], true);
    $member = $_GET['user_id'] ?? '';
    if ($member === $workspace['owner_id']) respond(422, ['error' => 'Owner tidak dapat dikeluarkan.']);
    $db->prepare('DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?')->execute([$id, $member]);
    respond(200, ['removed' => true, 'workspace' => workspaceResult($db, $id, $user['id'])]);
}
respond(405, ['error' => 'Metode tidak didukung.']);

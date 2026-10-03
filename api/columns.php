<?php
require __DIR__ . '/bootstrap.php';
$db = database();
$user = requireUser($db);
$workspaceId = $_GET['workspace_id'] ?? '';
if (!is_string($workspaceId)) respond(422, ['error' => 'Workspace tidak valid.']);
workspaceAccess($db, $workspaceId, $user['id']);
$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    $stmt = $db->prepare('SELECT * FROM columns WHERE workspace_id = ? ORDER BY sort_order, id');
    $stmt->execute([$workspaceId]);
    respond(200, ['columns' => $stmt->fetchAll()]);
}
if (!in_array($method, ['POST', 'PATCH', 'DELETE'], true)) respond(405, ['error' => 'Metode tidak didukung.']);
$db->beginTransaction();
$db->prepare('SELECT id FROM workspaces WHERE id = ? FOR UPDATE')->execute([$workspaceId]);
workspaceAccess($db, $workspaceId, $user['id']);
if ($method === 'PATCH') {
    $data = payload();
    $ids = $data['column_ids'] ?? null;
    if (!is_array($ids) || array_keys($ids) !== range(0, count($ids) - 1) || count($ids) === 0 ||
        count(array_filter($ids, 'is_string')) !== count($ids) ||
        count(array_unique($ids)) !== count($ids)) {
        respond(422, ['error' => 'Urutan harus berisi semua ID kolom tanpa duplikat.']);
    }

    $stmt = $db->prepare('SELECT id FROM columns WHERE workspace_id = ? ORDER BY id FOR UPDATE');
    $stmt->execute([$workspaceId]);
    $existing = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $sortedIds = $ids;
    sort($sortedIds, SORT_STRING);
    sort($existing, SORT_STRING);
    if ($sortedIds !== $existing) {
        $db->rollBack();
        respond(422, ['error' => 'Daftar kolom berubah. Muat ulang halaman sebelum mengatur urutan.']);
    }
    $update = $db->prepare('UPDATE columns SET sort_order = ? WHERE workspace_id = ? AND id = ?');
    foreach ($ids as $index => $columnId) {
        $update->execute([$index + 1, $workspaceId, $columnId]);
    }
    $stmt = $db->prepare('SELECT * FROM columns WHERE workspace_id = ? ORDER BY sort_order, id');
    $stmt->execute([$workspaceId]);
    $rows = $stmt->fetchAll();
    $db->commit();
    respond(200, ['columns' => $rows]);
}
if ($method === 'POST') {
    $data = payload();
    $label = textField($data, 'label', 1, 50);
    $description = textField($data, 'description', 0, 255);
    $color = $data['color'] ?? 'purple';
    if (!in_array($color, ['indigo', 'amber', 'emerald', 'rose', 'purple', 'sky', 'teal', 'orange', 'slate'], true)) respond(422, ['error' => 'Warna tidak valid.']);
    $base = substr(trim(preg_replace('/[^a-z0-9]+/', '_', strtolower($label)), '_'), 0, 30) ?: 'column';
    $id = $base;
    $exists = $db->prepare('SELECT id FROM columns WHERE workspace_id = ? AND id = ?');
    do {
        $exists->execute([$workspaceId, $id]);
        $duplicate = $exists->fetchColumn();
        if ($duplicate) $id = $base . '_' . bin2hex(random_bytes(4));
    } while ($duplicate);
    $stmt = $db->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM columns WHERE workspace_id = ?');
    $stmt->execute([$workspaceId]);
    $order = (int) $stmt->fetchColumn();
    $db->prepare('INSERT INTO columns (workspace_id, id, label, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)')->execute([$workspaceId, $id, $label, $description, $color, $order]);
    $db->commit();
    respond(201, ['column' => ['id' => $id, 'workspace_id' => $workspaceId, 'label' => $label, 'description' => $description, 'color' => $color, 'sort_order' => $order]]);
}
$id = $_GET['id'] ?? '';
if (!is_string($id) || in_array($id, ['todo', 'in_progress', 'done'], true)) respond(422, ['error' => 'Kolom utama tidak dapat dihapus.']);
$stmt = $db->prepare('SELECT id FROM columns WHERE workspace_id = ? AND id = ?');
$stmt->execute([$workspaceId, $id]);
if (!$stmt->fetchColumn()) respond(404, ['error' => 'Kolom tidak ditemukan.']);
$db->prepare("UPDATE tasks SET status = 'todo', completed_by = NULL, completed_at = NULL WHERE workspace_id = ? AND status = ?")->execute([$workspaceId, $id]);
$db->prepare('DELETE FROM columns WHERE workspace_id = ? AND id = ?')->execute([$workspaceId, $id]);
$db->commit();
respond(200, ['deleted' => true]);

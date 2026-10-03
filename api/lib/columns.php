<?php
function seedDefaultColumns(PDO $db, string $workspaceId): void {
    $stmt = $db->prepare('INSERT IGNORE INTO columns (workspace_id, id, label, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    foreach ([['todo', 'To Do', 'Ide yang siap dikerjakan', 'indigo', 1], ['in_progress', 'In Progress', 'Sedang dibawa jadi nyata', 'amber', 2], ['done', 'Done', 'Satu langkah lebih dekat', 'emerald', 3]] as $column) $stmt->execute(array_merge([$workspaceId], $column));
}
function validateTaskColumn(PDO $db, string $workspaceId, $status): void {
    if (!is_string($status)) respond(422, ['error' => 'Status tidak valid.']);
    $stmt = $db->prepare('SELECT id FROM columns WHERE workspace_id = ? AND id = ?');
    $stmt->execute([$workspaceId, $status]);
    if (!$stmt->fetchColumn()) respond(422, ['error' => 'Status tidak ditemukan di workspace ini.']);
}

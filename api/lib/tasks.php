<?php
function deadlineValue($value): ?string {
    if ($value === null || $value === '') return null;
    if (!is_string($value) || !preg_match('/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/', $value)) respond(422, ['error' => 'Deadline harus berupa tanggal YYYY-MM-DD.']);
    [$year, $month, $day] = array_map('intval', explode('-', $value));
    if ($year < 1000 || !checkdate($month, $day, $year)) respond(422, ['error' => 'Tanggal deadline tidak valid.']);
    return $value;
}
function taskRow(array $row): array {
    if ($row['completed_at'] !== null) $row['completed_at'] = (new DateTimeImmutable($row['completed_at'], new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
    $row['created_at'] = (new DateTimeImmutable($row['created_at'], new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
    return $row;
}
function findTask(PDO $db, string $id, string $workspaceId): array {
    $stmt = $db->prepare('SELECT t.*, creator.name AS creator_name, completer.name AS completer_name FROM tasks t LEFT JOIN users creator ON creator.id = t.created_by LEFT JOIN users completer ON completer.id = t.completed_by WHERE t.id = ? AND t.workspace_id = ?');
    $stmt->execute([$id, $workspaceId]);
    $task = $stmt->fetch();
    if (!$task) respond(404, ['error' => 'Task tidak ditemukan di workspace ini.']);
    return taskRow($task);
}

// Validasi perubahan dipakai bersama oleh edit manual dan tool AI.
function taskChanges(PDO $db, string $workspaceId, array $existingTask, array $data, string $userId): array {
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
        if ($data['status'] !== $existingTask['status']) {
            $updates[] = 'completed_by = ?';
            $values[] = $data['status'] === 'done' ? $userId : null;
            $updates[] = $data['status'] === 'done' ? 'completed_at = UTC_TIMESTAMP(3)' : 'completed_at = NULL';
        }
    }
    if (array_key_exists('deadline', $data)) {
        $updates[] = 'deadline = ?';
        $values[] = deadlineValue($data['deadline']);
    }
    if (!$updates) respond(422, ['error' => 'Isi judul, deskripsi, status, atau deadline yang ingin diubah.']);
    return ['updates' => $updates, 'values' => $values];
}

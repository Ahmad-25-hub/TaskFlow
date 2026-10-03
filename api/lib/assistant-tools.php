<?php
function assistantTools(array $columns): array {
    $taskFields = [
        'title' => ['type' => 'string', 'description' => 'Judul task, maksimal 120 karakter'],
        'description' => ['type' => 'string', 'description' => 'Deskripsi task, maksimal 1000 karakter'],
        'deadline' => ['type' => 'string', 'description' => 'Tanggal YYYY-MM-DD jika diminta; string kosong untuk menghapus deadline pada edit'],
    ];
    $taskId = ['type' => 'string', 'description' => 'ID persis dari existing_tasks, bukan judul atau ID buatan'];
    $definitions = [
        ['create_tasks', 'Buat task baru jika pengguna meminta. Semua masuk To Do.', $taskFields, ['title', 'description']],
        ['edit_tasks', 'Edit task yang sudah ada dan disebut pengguna. Sertakan hanya field yang diminta berubah. Jika target ambigu, tanyakan dulu.', array_merge(['task_id' => $taskId], $taskFields, ['status' => ['type' => 'string', 'enum' => array_column($columns, 'id'), 'description' => 'ID kolom tujuan dari available_columns, hanya jika diminta']]), ['task_id']],
        ['delete_tasks', 'Hapus task yang disebut pengguna hanya bila pengguna meminta penghapusan. Jika target ambigu, tanyakan dulu.', ['task_id' => $taskId], ['task_id']],
    ];
    return array_map(function ($definition) {
        [$name, $description, $properties, $required] = $definition;
        return ['type' => 'function', 'name' => $name, 'description' => $description, 'parameters' => ['type' => 'object', 'properties' => ['tasks' => ['type' => 'array', 'minItems' => 1, 'maxItems' => 20, 'items' => ['type' => 'object', 'properties' => $properties, 'required' => $required]]], 'required' => ['tasks']]];
    }, $definitions);
}

function assistantOperations(array $result, array $snapshot): array {
    $text = [];
    $operations = [];
    $targets = [];
    $knownTasks = array_column($snapshot, null, 'id');
    $allowed = ['create_tasks' => ['title', 'description', 'deadline'], 'edit_tasks' => ['task_id', 'title', 'description', 'status', 'deadline'], 'delete_tasks' => ['task_id']];
    foreach ($result['steps'] as $step) {
        if (($step['type'] ?? '') === 'model_output') {
            foreach ($step['content'] ?? [] as $part) if (($part['type'] ?? '') === 'text' && is_string($part['text'] ?? null)) $text[] = $part['text'];
        }
        if (($step['type'] ?? '') !== 'function_call') continue;
        $name = $step['name'] ?? '';
        if (!is_string($name) || !isset($allowed[$name])) respond(502, ['error' => 'AI meminta tindakan yang belum didukung. Tidak ada task yang diubah.']);
        $args = $step['arguments'] ?? null;
        if (is_string($args)) $args = json_decode($args, true);
        $batch = is_array($args) ? ($args['tasks'] ?? null) : null;
        if (!is_array($batch) || !$batch || array_keys($batch) !== range(0, count($batch) - 1)) respond(502, ['error' => 'Daftar task dari AI tidak valid. Tidak ada task yang diubah.']);
        foreach ($batch as $draft) {
            if (!is_array($draft) || array_diff(array_keys($draft), $allowed[$name])) respond(502, ['error' => 'Data tindakan AI tidak valid. Tidak ada task yang diubah.']);
            if ($name === 'create_tasks') {
                $draft = ['title' => textField($draft, 'title', 1, 120), 'description' => textField($draft, 'description', 0, 1000), 'deadline' => deadlineValue($draft['deadline'] ?? null)];
            } else {
                $id = $draft['task_id'] ?? null;
                if (!is_string($id) || !isset($knownTasks[$id])) respond(422, ['error' => 'Task pilihan AI tidak ditemukan pada konteks workspace ini. Tidak ada task yang diubah.']);
                if (isset($targets[$id])) respond(422, ['error' => 'AI memilih task yang sama untuk beberapa tindakan. Kirim perintah yang lebih spesifik.']);
                $targets[$id] = true;
            }
            $operations[] = ['kind' => $name, 'data' => $draft];
            if (count($operations) > 20) respond(502, ['error' => 'Maksimal 20 tindakan task per pesan. Tidak ada task yang diubah.']);
        }
    }
    return ['operations' => $operations, 'reply' => mb_substr(trim(implode("\n", $text)), 0, 8000)];
}

function executeAssistantOperations(PDO $db, string $workspaceId, string $userId, array $operations, array $snapshot): array {
    $knownTasks = array_column($snapshot, null, 'id');
    // Semua target dan field divalidasi sebelum tindakan pertama ditulis.
    foreach ($operations as &$operation) {
        if ($operation['kind'] === 'create_tasks') { validateTaskColumn($db, $workspaceId, 'todo'); continue; }
        $id = $operation['data']['task_id'];
        $current = findTask($db, $id, $workspaceId);
        foreach (['title', 'description', 'status', 'deadline'] as $field) {
            if ($current[$field] !== $knownTasks[$id][$field]) respond(409, ['error' => 'Task berubah saat AI memproses pesan. Tidak ada task yang diubah; kirim ulang agar AI membaca data terbaru.']);
        }
        $operation['current'] = $current;
        if ($operation['kind'] === 'edit_tasks') $operation['changes'] = taskChanges($db, $workspaceId, $current, $operation['data'], $userId);
    }
    unset($operation);
    $changes = ['tasks' => [], 'updated_tasks' => [], 'deleted_tasks' => []];
    foreach ($operations as $operation) {
        $data = $operation['data'];
        if ($operation['kind'] === 'create_tasks') {
            $id = uuid();
            $db->prepare("INSERT INTO tasks (id, title, description, status, workspace_id, created_by, deadline) VALUES (?, ?, ?, 'todo', ?, ?, ?)")->execute([$id, $data['title'], $data['description'], $workspaceId, $userId, $data['deadline']]);
            $changes['tasks'][] = findTask($db, $id, $workspaceId);
        } elseif ($operation['kind'] === 'edit_tasks') {
            $edit = $operation['changes'];
            $db->prepare('UPDATE tasks SET ' . implode(', ', $edit['updates']) . ' WHERE id = ? AND workspace_id = ?')->execute(array_merge($edit['values'], [$data['task_id'], $workspaceId]));
            $changes['updated_tasks'][] = findTask($db, $data['task_id'], $workspaceId);
        } else {
            $db->prepare('DELETE FROM tasks WHERE id = ? AND workspace_id = ?')->execute([$data['task_id'], $workspaceId]);
            $changes['deleted_tasks'][] = $operation['current'];
        }
    }
    return $changes;
}

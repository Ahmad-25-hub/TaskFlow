<?php
// Server Gemini tiruan untuk pengujian terisolasi; tidak memakai key Google asli.
header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] === 'GET') { echo json_encode(['ready' => true]); exit; }
$request = json_decode(file_get_contents('php://input'), true);
$context = json_decode($request['input'] ?? '', true);
$message = $context['latest_user_message'] ?? '';
if (($_SERVER['HTTP_X_GOOG_API_KEY'] ?? '') !== 'taskflow-test-key' || ($request['store'] ?? true) !== false || ($request['tools'][0]['name'] ?? '') !== 'create_tasks') { http_response_code(400); echo '{}'; exit; }
if (strpos($message, 'simulate_quota') !== false) { http_response_code(429); echo '{}'; exit; }
if (strpos($message, 'simulate_key') !== false) { http_response_code(403); echo '{}'; exit; }
if (strpos($message, 'simulate_incomplete') !== false) { echo json_encode(['status' => 'incomplete', 'steps' => []]); exit; }
if (strpos($message, 'simulate_invalid') !== false) {
    echo json_encode(['status' => 'requires_action', 'steps' => [['type' => 'function_call', 'name' => 'create_tasks', 'arguments' => ['tasks' => [['title' => 'Tidak boleh tersimpan', 'description' => 'Valid'], ['title' => ' ', 'description' => 'Invalid']]]]]]); exit;
}
if (strpos($message, 'simulate_unknown') !== false) {
    echo json_encode(['status' => 'requires_action', 'steps' => [['type' => 'function_call', 'name' => 'archive_tasks', 'arguments' => []]]]); exit;
}
if (strpos($message, 'fixture_calls:') === 0) {
    $calls = json_decode(substr($message, strlen('fixture_calls:')), true);
    echo json_encode(['status' => 'requires_action', 'steps' => $calls]); exit;
}
if (strpos($message, 'simulate_changed:') === 0) {
    require_once __DIR__ . '/../../api/lib/database.php';
    if (!preg_match('/^taskflow_test_[a-z0-9_]+$/', getenv('TASKFLOW_DB_NAME') ?: '')) { http_response_code(400); exit; }
    $id = substr($message, strlen('simulate_changed:'));
    database()->prepare('UPDATE tasks SET title = ? WHERE id = ?')->execute(['Judul diubah anggota lain', $id]);
    echo json_encode(['status' => 'requires_action', 'steps' => [['type' => 'function_call', 'name' => 'delete_tasks', 'arguments' => ['tasks' => [['task_id' => $id]]]]]]); exit;
}
if (strpos($message, 'Ubah task Riset kebutuhan perusahaan') === 0) {
    $tasks = array_values(array_filter($context['existing_tasks'] ?? [], function ($task) { return $task['title'] === 'Riset kebutuhan perusahaan'; }));
    if (count($tasks) !== 1) {
        echo json_encode(['status' => 'completed', 'steps' => [['type' => 'model_output', 'content' => [['type' => 'text', 'text' => 'Ada beberapa task dengan nama tersebut. Task mana yang ingin diubah?']]]]]); exit;
    }
    echo json_encode(['status' => 'requires_action', 'steps' => [['type' => 'function_call', 'name' => 'edit_tasks', 'arguments' => ['tasks' => [['task_id' => $tasks[0]['id'], 'title' => 'Riset profil perusahaan', 'deadline' => '2030-11-20', 'status' => 'done']]]]]]); exit;
}
if ($message === 'Hapus task Riset profil perusahaan') {
    $tasks = array_values(array_filter($context['existing_tasks'] ?? [], function ($task) { return $task['title'] === 'Riset profil perusahaan'; }));
    echo json_encode(['status' => 'requires_action', 'steps' => [['type' => 'function_call', 'name' => 'delete_tasks', 'arguments' => ['tasks' => array_map(function ($task) { return ['task_id' => $task['id']]; }, $tasks)]]]]); exit;
}
if (strpos(strtolower($message), 'buat') !== false) {
    $tasks = [
        ['title' => 'Riset kebutuhan perusahaan', 'description' => 'Tentukan tujuan, audiens, dan kebutuhan konten.'],
        ['title' => 'Desain halaman profil perusahaan', 'description' => 'Susun struktur halaman dan desain responsif.'],
        ['title' => 'Implementasi website perusahaan', 'description' => 'Bangun halaman dan lakukan pengujian.'],
    ];
    if (strpos($message, 'deadline') !== false) $tasks[0]['deadline'] = '2030-10-10';
    echo json_encode(['status' => 'requires_action', 'steps' => [['type' => 'function_call', 'name' => 'create_tasks', 'arguments' => ['tasks' => $tasks]]]]); exit;
}
$reply = 'Saya bisa membantu merencanakan proyek di ' . ($context['workspace'] ?? '') . '.';
if (strpos($message, 'ingat') !== false) $reply .= ' Pesan sebelumnya: ' . ($context['conversation'][0]['text'] ?? 'kosong');
echo json_encode(['status' => 'completed', 'steps' => [['type' => 'model_output', 'content' => [['type' => 'text', 'text' => $reply]]]]]);

<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/database.php';
require_once __DIR__ . '/lib/columns.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
ini_set('session.use_strict_mode', '1');
session_name('taskflow_session');
session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
session_start();

function respond(int $status, array $body): void {
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

set_exception_handler(function (Throwable $error): void {
    error_log('TaskFlow: ' . $error->getMessage());
    respond(500, ['error' => 'Operasi gagal. Pastikan MySQL aktif dan migrasi database sudah dijalankan.']);
});

function uuid(): string {
    $bytes = random_bytes(16);
    $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
    $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
    $hex = bin2hex($bytes);
    return substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4) . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20);
}

function payload(): array {
    $data = json_decode(file_get_contents('php://input'));
    if (!is_object($data)) respond(400, ['error' => 'JSON tidak valid.']);
    return get_object_vars($data);
}

function textField(array $data, string $key, int $min, int $max): string {
    $value = $data[$key] ?? '';
    if (!is_string($value)) respond(422, ['error' => "Field $key harus berupa teks."]);
    $value = trim($value);
    if (mb_strlen($value) < $min || mb_strlen($value) > $max) {
        respond(422, ['error' => "Field $key harus berisi $min–$max karakter."]);
    }
    return $value;
}

function requireUser(PDO $db): array {
    $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id'] ?? '']);
    $user = $stmt->fetch();
    if (!$user) respond(401, ['error' => 'Silakan login untuk melanjutkan.']);
    return $user;
}

function workspaceAccess(PDO $db, string $id, string $userId, bool $ownerOnly = false): array {
    $stmt = $db->prepare('SELECT w.*, IF(w.owner_id = m.user_id, \'owner\', \'member\') AS role FROM workspaces w JOIN workspace_members m ON m.workspace_id = w.id WHERE w.id = ? AND m.user_id = ?');
    $stmt->execute([$id, $userId]);
    $workspace = $stmt->fetch();
    if (!$workspace || ($ownerOnly && $workspace['role'] !== 'owner')) {
        respond(403, ['error' => $ownerOnly ? 'Hanya owner yang dapat mengatur workspace.' : 'Kamu bukan anggota workspace ini.']);
    }
    return $workspace;
}

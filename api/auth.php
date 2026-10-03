<?php
require __DIR__ . '/bootstrap.php';
$db = database();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    $stmt = $db->prepare('SELECT id, name, email FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id'] ?? '']);
    respond(200, ['user' => $stmt->fetch() ?: null]);
}
if ($method !== 'POST') respond(405, ['error' => 'Metode tidak didukung.']);
if ($action === 'logout') {
    $_SESSION = [];
    setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
    session_destroy();
    respond(200, ['user' => null]);
}
if (!in_array($action, ['login', 'register'], true)) respond(400, ['error' => 'Aksi tidak valid.']);
$data = payload();
$email = strtolower(textField($data, 'email', 3, 190));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(422, ['error' => 'Alamat email tidak valid.']);
$password = $data['password'] ?? '';
if (!is_string($password) || mb_strlen($password) < 6 || strlen($password) > 72) {
    respond(422, ['error' => 'Password minimal 6 karakter dan maksimal 72 byte.']);
}

if ($action === 'login') {
    $stmt = $db->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) respond(401, ['error' => 'Email atau password salah.']);
    unset($user['password_hash']);
} else {
    $name = textField($data, 'name', 2, 80);
    $user = ['id' => uuid(), 'name' => $name, 'email' => $email];
    $db->beginTransaction();
    try {
        $stmt = $db->prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)');
        $stmt->execute([$user['id'], $name, $email, password_hash($password, PASSWORD_DEFAULT)]);
        // Workspace migrasi hanya diberikan satu kali, ke akun pertama yang mendaftar.
        $legacyId = '00000000-0000-4000-8000-000000000000';
        $stmt = $db->prepare('SELECT owner_id FROM workspaces WHERE id = ? FOR UPDATE');
        $stmt->execute([$legacyId]);
        $legacy = $stmt->fetch();
        if ($legacy && $legacy['owner_id'] === null) {
            $db->prepare('UPDATE workspaces SET owner_id = ? WHERE id = ?')->execute([$user['id'], $legacyId]);
            $db->prepare('INSERT INTO workspace_members (workspace_id, user_id) VALUES (?, ?)')->execute([$legacyId, $user['id']]);
            $db->prepare('UPDATE tasks SET created_by = ? WHERE workspace_id = ? AND created_by IS NULL')->execute([$user['id'], $legacyId]);
        }
        $db->commit();
    } catch (PDOException $error) {
        $db->rollBack();
        if ($error->getCode() === '23000') respond(409, ['error' => 'Email sudah digunakan. Silakan login.']);
        throw $error;
    }
}
session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];
respond($action === 'register' ? 201 : 200, ['user' => $user]);

<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require_once dirname(__DIR__) . '/api/lib/database.php';
$db = database();
// Tetap gunakan database dari konfigurasi koneksi, termasuk database pengujian.
$schema = preg_replace('/CREATE DATABASE[^;]+;|USE taskflow;/i', '', file_get_contents(__DIR__ . '/schema.sql'));
$db->exec($schema);
foreach (['workspace_id', 'created_by'] as $column) {
    $stmt = $db->prepare('SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = \'tasks\' AND COLUMN_NAME = ?');
    $stmt->execute([$column]);
    if (!$stmt->fetchColumn()) $db->exec("ALTER TABLE tasks ADD COLUMN $column CHAR(36) NULL");
}
$hasDeadline = $db->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'deadline'")->fetchColumn();
if (!$hasDeadline) $db->exec('ALTER TABLE tasks ADD COLUMN deadline DATE NULL');
foreach (['completed_by' => 'CHAR(36)', 'completed_at' => 'DATETIME(3)'] as $column => $type) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = ?");
    $stmt->execute([$column]);
    if (!$stmt->fetchColumn()) $db->exec("ALTER TABLE tasks ADD COLUMN $column $type NULL");
}
$legacyId = '00000000-0000-4000-8000-000000000000';
$db->prepare('INSERT IGNORE INTO workspaces (id, name, description, invite_code) VALUES (?, ?, ?, ?)')->execute([$legacyId, 'TaskFlow Hackathon', 'Workspace awal untuk task yang sudah ada.', strtoupper(bin2hex(random_bytes(4)))]);
$db->prepare('UPDATE tasks SET workspace_id = ? WHERE workspace_id IS NULL')->execute([$legacyId]);
$nullable = $db->query("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'workspace_id'")->fetchColumn();
if ($nullable === 'YES') $db->exec('ALTER TABLE tasks MODIFY workspace_id CHAR(36) NOT NULL');
foreach (['fk_tasks_workspace' => 'FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE', 'fk_tasks_completer' => 'FOREIGN KEY (completed_by) REFERENCES users(id) ON DELETE SET NULL', 'fk_tasks_creator' => 'FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL'] as $constraintName => $definition) {
    $stmt = $db->prepare('SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = \'tasks\' AND CONSTRAINT_NAME = ?');
    $stmt->execute([$constraintName]);
    if (!$stmt->fetchColumn()) $db->exec("ALTER TABLE tasks ADD CONSTRAINT $constraintName $definition");
}

$hasIndex = $db->query("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND INDEX_NAME = 'idx_tasks_workspace_status'")->fetchColumn();
if (!$hasIndex) $db->exec('ALTER TABLE tasks ADD INDEX idx_tasks_workspace_status (workspace_id, status)');
require_once dirname(__DIR__) . '/api/lib/columns.php';
$type = $db->query("SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'status'")->fetchColumn();
if ($type !== 'varchar') $db->exec("ALTER TABLE tasks MODIFY status VARCHAR(50) NOT NULL DEFAULT 'todo'");
$hasWorkspace = $db->query("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'columns' AND COLUMN_NAME = 'workspace_id'")->fetchColumn();
if (!$hasWorkspace) $db->exec('ALTER TABLE columns ADD workspace_id CHAR(36) NULL');
$db->prepare('UPDATE columns SET workspace_id = ? WHERE workspace_id IS NULL')->execute([$legacyId]);
$keys = $db->query("SELECT COLUMN_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'columns' AND INDEX_NAME = 'PRIMARY' ORDER BY SEQ_IN_INDEX")->fetchAll(PDO::FETCH_COLUMN);
if ($keys !== ['workspace_id', 'id']) $db->exec('ALTER TABLE columns DROP PRIMARY KEY, ADD PRIMARY KEY (workspace_id, id)');
$nullable = $db->query("SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'columns' AND COLUMN_NAME = 'workspace_id'")->fetchColumn();
if ($nullable === 'YES') $db->exec('ALTER TABLE columns MODIFY workspace_id CHAR(36) NOT NULL');
$hasForeignKey = $db->query("SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'columns' AND CONSTRAINT_NAME = 'fk_columns_workspace'")->fetchColumn();
if (!$hasForeignKey) $db->exec('ALTER TABLE columns ADD CONSTRAINT fk_columns_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE');
foreach ($db->query('SELECT id FROM workspaces')->fetchAll(PDO::FETCH_COLUMN) as $workspaceId) seedDefaultColumns($db, $workspaceId);
// Keep tasks with historical custom statuses visible after migrating.
$db->exec("INSERT IGNORE INTO columns (workspace_id, id, label, color, sort_order) SELECT DISTINCT t.workspace_id, t.status, t.status, 'slate', 100 FROM tasks t LEFT JOIN columns c ON c.workspace_id = t.workspace_id AND c.id = t.status WHERE c.id IS NULL");
echo "Migrasi selesai. Akun, workspace, task, dan kolom lama dipertahankan.\n";

<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/api/lib/database.php';
$name = getenv('TASKFLOW_DB_NAME') ?: '';
if (!preg_match('/^taskflow_test_[a-z0-9_]+$/', $name)) { fwrite(STDERR, "Nama database test tidak valid.\n"); exit(1); }
$connection = database(false);
if (($argv[1] ?? '') === 'drop') { $connection->exec("DROP DATABASE IF EXISTS `$name`"); exit; }
$connection->exec("CREATE DATABASE `$name` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
try {
    require __DIR__ . '/migrate.php';
    $db->exec(str_replace('USE taskflow;', '', file_get_contents(__DIR__ . '/seed.sql')));
} catch (Throwable $error) {
    $connection->exec("DROP DATABASE `$name`");
    fwrite(STDERR, $error->getMessage() . "\n");
    exit(1);
}

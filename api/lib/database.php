<?php
declare(strict_types=1);

function database(bool $selectDatabase = true): PDO {
    $host = getenv('TASKFLOW_DB_HOST') ?: '127.0.0.1';
    $port = getenv('TASKFLOW_DB_PORT') ?: '3306';
    $name = getenv('TASKFLOW_DB_NAME') ?: 'taskflow';
    $user = getenv('TASKFLOW_DB_USER') ?: 'root';
    $password = getenv('TASKFLOW_DB_PASSWORD') ?: '';
    $dsn = "mysql:host=$host;port=$port;charset=utf8mb4" . ($selectDatabase ? ";dbname=$name" : '');
    $db = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $db->exec("SET time_zone = '+00:00'");
    return $db;
}

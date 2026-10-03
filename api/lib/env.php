<?php
declare(strict_types=1);

// Environment proses (termasuk database pengujian) selalu lebih diutamakan.
function loadEnvironment(string $path): void {
    if (!is_file($path)) return;
    foreach (file($path, FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#' || strpos($line, '=') === false) continue;
        [$key, $value] = explode('=', $line, 2);
        $key = trim($key); $value = trim($value);
        if (!preg_match('/^[A-Z][A-Z0-9_]*$/', $key) || getenv($key) !== false) continue;
        if (strlen($value) >= 2 && (($value[0] === '"' && substr($value, -1) === '"') || ($value[0] === "'" && substr($value, -1) === "'"))) $value = substr($value, 1, -1);
        putenv($key . '=' . $value);
    }
}
loadEnvironment(dirname(__DIR__, 2) . '/.env');

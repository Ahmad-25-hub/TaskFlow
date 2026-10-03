<?php
// Router server PHP lokal: jangan layani konfigurasi dan backup sebagai file publik.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?: '/');
if (preg_match('~(?:^|/)\.|^/(?:database|tests|scripts|dokumen)(?:/|$)|^/api/lib(?:/|$)|\.(?:local|sql)$~i', $path)) {
    http_response_code(404);
    echo 'Not found';
    return true;
}
return false;

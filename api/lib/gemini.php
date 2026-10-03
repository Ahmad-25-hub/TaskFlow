<?php
function geminiInteraction(array $body): array {
    $key = getenv('GEMINI_API_KEY') ?: '';
    if ($key === '') respond(503, ['error' => 'Asisten AI belum dikonfigurasi. Isi GEMINI_API_KEY pada file .env.']);
    if (!function_exists('curl_init')) respond(503, ['error' => 'Aktifkan ekstensi cURL pada PHP untuk menggunakan AI.']);
    $url = 'https://generativelanguage.googleapis.com/v1beta/interactions';
    // Provider tiruan hanya tersedia pada database pengujian dan alamat loopback.
    if (preg_match('/^taskflow_test_[a-z0-9_]+$/', getenv('TASKFLOW_DB_NAME') ?: '') && getenv('TASKFLOW_GEMINI_TEST_URL') === 'http://127.0.0.1:8002') $url = 'http://127.0.0.1:8002';
    $curl = curl_init($url);
    curl_setopt_array($curl, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 60, CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'x-goog-api-key: ' . $key], CURLOPT_POSTFIELDS => json_encode($body, JSON_UNESCAPED_UNICODE)]);
    $raw = curl_exec($curl);
    $status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curlError = curl_errno($curl);
    curl_close($curl);
    if ($raw === false) respond(502, ['error' => $curlError === CURLE_SSL_CACERT ? 'Sertifikat HTTPS PHP belum siap. Atur curl.cainfo di php.ini, lalu restart server PHP.' : 'Google AI belum dapat dihubungi. Coba lagi dalam beberapa saat.']);
    if ($status === 429) respond(429, ['error' => 'Kuota atau batas permintaan Google AI tercapai. Coba lagi nanti atau periksa kuota API key.']);
    if (in_array($status, [401, 403], true)) respond(502, ['error' => 'Google AI menolak API key. Periksa API key dan akses model di Google AI Studio.']);
    if ($status === 404) respond(502, ['error' => 'Model AI tidak tersedia. Periksa GEMINI_MODEL pada .env.']);
    if ($status < 200 || $status >= 300) respond(502, ['error' => 'Permintaan Google AI gagal. Periksa model dan konfigurasi Google AI Studio.']);
    $result = json_decode($raw, true);
    if (!is_array($result) || !is_array($result['steps'] ?? null) || !in_array($result['status'] ?? '', ['completed', 'requires_action'], true)) respond(502, ['error' => 'Respons AI belum lengkap atau tidak dapat diproses. Coba lagi.']);
    return $result;
}

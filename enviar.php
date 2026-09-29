<?php
declare(strict_types=1);
// Fixed recipients; deployed only on the M20 PHP hosting.
$config = [
    'contact' => 'info@m20mayorista.com',
    'careers' => 'rrhh@m20mayorista.com',
    'from' => 'info@m20mayorista.com',
];
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
function respond(int $code, bool $ok, string $message): void {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
// Log operational events only: never names, addresses, IPs, messages or CVs.
function auditEvent(string $event): void {
    error_log('[m20-forms] ' . $event);
}
function unavailable(string $event): void {
    auditEvent($event);
    respond(503, false, 'El envío no está disponible. Intentá más tarde.');
}
set_exception_handler(function (Throwable $error): void {
    unavailable('unexpected_' . get_class($error));
});

function field(string $name, int $max, bool $required = true): string {
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) respond(422, false, 'Revisá los datos del formulario.');
    $value = trim($value);
    if (($required && $value === '') || strlen($value) > $max || !preg_match('//u', $value) || str_contains($value, "\0")) respond(422, false, 'Revisá los campos obligatorios y la longitud de tu mensaje.');
    return $value;
}
$allowedOrigins = ['https://m20mayorista.com', 'https://www.m20mayorista.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
header('Vary: Origin');
if (!in_array($origin, $allowedOrigins, true)) respond(403, false, 'Origen no permitido.');
header('Access-Control-Allow-Origin: ' . $origin);
$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method === 'OPTIONS') {
    if (($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'] ?? '') !== 'POST') respond(405, false, 'Método no permitido.');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Access-Control-Max-Age: 600');
    http_response_code(204);
    exit;
}
if ($method !== 'POST') { header('Allow: POST, OPTIONS'); respond(405, false, 'Método no permitido.'); }
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 6 * 1024 * 1024) respond(413, false, 'El archivo debe ser un PDF de hasta 5 MB.');
if (!$_POST) respond(422, false, 'No recibimos los datos. Revisá el tamaño del archivo e intentá otra vez.');
if (field('website', 500, false) !== '') respond(422, false, 'No se pudo enviar el formulario.');
$started = field('started_at', 16);
if (!ctype_digit($started) || (int)$started > time() - 3 || (int)$started < time() - 86400) respond(422, false, 'Esperá unos segundos o recargá la página e intentá otra vez.');
$kind = field('kind', 20);
if (!in_array($kind, ['contact', 'careers'], true)) respond(422, false, 'Formulario no válido.');
$name = field('name', 300);
$email = field('email', 150);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || preg_match('/[\r\n]/', $email)) respond(422, false, 'Ingresá un email válido.');
$body = "Nombre: $name\nEmail: $email\n";
$attachment = null;
if ($kind === 'careers') {
    $body .= 'Teléfono: ' . field('phone', 100) . "\nLocalidad: " . field('area', 300) . "\n\n" . field('profile', 5000);
    $file = $_FILES['cv'] ?? null;
    if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_string($file['tmp_name'] ?? null) || !is_string($file['name'] ?? null) || !is_uploaded_file($file['tmp_name'])) respond(422, false, 'Adjuntá tu CV en PDF, de hasta 5 MB.');
    if (($file['size'] ?? 0) < 1 || $file['size'] > 5 * 1024 * 1024) respond(422, false, 'El CV debe pesar hasta 5 MB.');
    if (!class_exists('finfo')) respond(503, false, 'El envío de archivos no está disponible. Intentá más tarde.');
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    if ($mime !== 'application/pdf' || strtolower(pathinfo((string)$file['name'], PATHINFO_EXTENSION)) !== 'pdf') respond(422, false, 'Solo se admiten archivos PDF.');
    $attachment = file_get_contents($file['tmp_name']);
    if ($attachment === false) respond(500, false, 'No se pudo leer el archivo.');
} else {
    $branches = ['jcp1' => 'José C. Paz — Hipólito Irigoyen 4038', 'esquina' => 'José C. Paz — Hipólito 4154 esquina Ballesteros', 'moreno' => 'Moreno · Cuartel V', 'pilar' => 'Pilar'];
    $branch = field('branch', 20);
    if (!isset($branches[$branch])) respond(422, false, 'Elegí una sucursal válida.');
    $format = field('format', 80);
    if (!in_array($format, ['Por unidad', 'Caja cerrada', 'Por pallet', 'Quiero consultar'], true)) respond(422, false, 'Elegí una forma de compra válida.');
    $body .= 'Comercio: ' . field('business', 300, false) . "\nSucursal: " . $branches[$branch] . "\nForma de compra: $format\n\n" . field('message', 6000);
}
// One bounded, private state file: atomic global/IP reservation, no IP stored in clear.
$stateDir = sys_get_temp_dir() . '/m20-forms-' . hash('sha256', __DIR__);
if (is_link($stateDir) || (!is_dir($stateDir) && !@mkdir($stateDir, 0700) && !is_dir($stateDir))) unavailable('rate_directory_unavailable');
if (!@chmod($stateDir, 0700)) unavailable('rate_directory_permissions');
$statePath = $stateDir . '/state.json';
if (is_link($statePath)) unavailable('rate_state_link');
$lock = @fopen($statePath, 'c+');
if (!$lock || !@chmod($statePath, 0600) || !flock($lock, LOCK_EX)) unavailable('rate_lock_unavailable');
$raw = stream_get_contents($lock, 65537);
if ($raw === false || strlen($raw) > 65536) unavailable('rate_state_unreadable');
$now = time();
$hour = (int)floor($now / 3600);
$state = $raw === '' ? ['hour' => $hour, 'count' => 0, 'recent' => []] : json_decode($raw, true, 8, JSON_THROW_ON_ERROR);
if (!is_array($state) || !is_int($state['hour'] ?? null) || !is_int($state['count'] ?? null) || $state['count'] < 0 || !is_array($state['recent'] ?? null)) unavailable('rate_state_invalid');
foreach ($state['recent'] as $key => $stamp) {
    if (!is_string($key) || !preg_match('/^[a-f0-9]{64}$/D', $key) || !is_int($stamp)) unavailable('rate_state_invalid');
    if ($stamp <= $now - 60) unset($state['recent'][$key]);
}
// Keep only hashes for one hour; exact repeat submissions are not mailed twice.
$state['duplicates'] = $state['duplicates'] ?? [];
if (!is_array($state['duplicates'])) unavailable('duplicate_state_invalid');
foreach ($state['duplicates'] as $key => $stamp) {
    if (!is_string($key) || !preg_match('/^[a-f0-9]{64}$/D', $key) || !is_int($stamp)) unavailable('duplicate_state_invalid');
    if ($stamp <= $now - 3600) unset($state['duplicates'][$key]);
}
$fingerprint = hash('sha256', $kind . "\0" . $body . "\0" . hash('sha256', $attachment ?? ''));
if (isset($state['duplicates'][$fingerprint])) {
    fclose($lock);
    header('Retry-After: ' . max(1, 3600 - ($now - $state['duplicates'][$fingerprint])));
    respond(429, false, 'Ya recibimos un envío igual recientemente. Esperá antes de reenviarlo.');
}
if ($state['hour'] !== $hour) { $state['hour'] = $hour; $state['count'] = 0; }
$client = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . __DIR__);
if (isset($state['recent'][$client]) || $state['count'] >= 100) {
    $retry = isset($state['recent'][$client]) ? max(1, 60 - ($now - $state['recent'][$client])) : 3600 - ($now % 3600);
    fclose($lock);
    header('Retry-After: ' . $retry);
    respond(429, false, 'Se alcanzó el límite de envíos. Esperá un momento antes de reintentar.');
}
$state['count']++;
$state['recent'][$client] = $now;
$state['duplicates'][$fingerprint] = $now;
$encoded = json_encode($state, JSON_THROW_ON_ERROR);
if (!ftruncate($lock, 0) || !rewind($lock) || fwrite($lock, $encoded) !== strlen($encoded) || !fflush($lock)) unavailable('rate_state_write_failed');
flock($lock, LOCK_UN);
fclose($lock);
$subject = $kind === 'careers' ? 'Postulación laboral - Mayorista 2020' : 'Consulta web - Mayorista 2020';
$headers = "From: Mayorista 2020 <{$config['from']}>\r\nReply-To: $email\r\nMIME-Version: 1.0\r\n";
if ($attachment !== null) {
    $boundary = 'm20_' . bin2hex(random_bytes(18));
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"";
    $message = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($body));
    $message .= "--$boundary\r\nContent-Type: application/pdf; name=\"curriculum.pdf\"\r\nContent-Disposition: attachment; filename=\"curriculum.pdf\"\r\nContent-Transfer-Encoding: base64\r\n\r\n" . chunk_split(base64_encode($attachment)) . "--$boundary--\r\n";
} else {
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64";
    $message = chunk_split(base64_encode($body));
}
if (!function_exists('mail') || !@mail($config[$kind], '=?UTF-8?B?' . base64_encode($subject) . '?=', $message, $headers, '-f' . $config['from'])) {
    $retryLock = @fopen($statePath, 'r+');
    if ($retryLock && flock($retryLock, LOCK_EX)) {
        $retryState = json_decode(stream_get_contents($retryLock), true);
        if (is_array($retryState) && ($retryState['duplicates'][$fingerprint] ?? null) === $now) {
            unset($retryState['duplicates'][$fingerprint]);
            $retryJson = json_encode($retryState, JSON_THROW_ON_ERROR);
            if (!ftruncate($retryLock, 0) || !rewind($retryLock) || fwrite($retryLock, $retryJson) !== strlen($retryJson) || !fflush($retryLock)) auditEvent('duplicate_release_failed');
        }
        flock($retryLock, LOCK_UN);
    }
    if ($retryLock) fclose($retryLock);
    unavailable('mail_failed_' . $kind);
}
auditEvent('mail_accepted_' . $kind);
respond(200, true, $kind === 'careers' ? 'Tu postulación fue enviada. Gracias por compartir tu CV.' : 'Tu consulta fue enviada. Gracias por escribirnos.');

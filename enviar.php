<?php
declare(strict_types=1);
// Change recipients here. This file must run on the final PHP hosting, not Pages.
$config = [
    'contact' => 'info@m20mayorista.com',
    'careers' => 'rrhh@m20mayorista.com',
    'from' => 'info@m20mayorista.com',
];
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
function respond(int $code, bool $ok, string $message): void {
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
function field(string $name, int $max, bool $required = true): string {
    $value = $_POST[$name] ?? '';
    if (!is_string($value)) respond(422, false, 'Revisá los datos del formulario.');
    $value = trim($value);
    if (($required && $value === '') || strlen($value) > $max || !preg_match('//u', $value) || str_contains($value, "\0")) respond(422, false, 'Revisá los campos obligatorios y la longitud de tu mensaje.');
    return $value;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') { header('Allow: POST'); respond(405, false, 'Método no permitido.'); }
if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') respond(403, false, 'Origen no permitido.');
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 6 * 1024 * 1024) respond(413, false, 'El archivo debe ser un PDF de hasta 5 MB.');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && strcasecmp((string)parse_url($origin, PHP_URL_HOST), explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]) !== 0) respond(403, false, 'Origen no permitido.');
if (field('website', 500, false) !== '') respond(422, false, 'No se pudo enviar el formulario.');
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
    $branches = ['jcp1' => 'JCP 1', 'esquina' => 'JCP Esquina', 'moreno' => 'Moreno · Cuartel V', 'pilar' => 'Pilar'];
    $branch = field('branch', 20);
    if (!isset($branches[$branch])) respond(422, false, 'Elegí una sucursal válida.');
    $format = field('format', 80);
    if (!in_array($format, ['Por unidad', 'Caja cerrada', 'Por pallet', 'Quiero consultar'], true)) respond(422, false, 'Elegí una forma de compra válida.');
    $body .= 'Comercio: ' . field('business', 300, false) . "\nSucursal: " . $branches[$branch] . "\nForma de compra: $format\n\n" . field('message', 6000);
}
// Short per-IP cooldown, outside the public site; no CV or message stored on disk.
$ratePath = sys_get_temp_dir() . '/m20-form-' . hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? 'unknown') . __DIR__);
$lock = @fopen($ratePath, 'c+');
if (!$lock || !flock($lock, LOCK_EX)) respond(503, false, 'El envío no está disponible. Intentá más tarde.');
$last = (int)stream_get_contents($lock);
if ($last > time() - 60) { fclose($lock); respond(429, false, 'Esperá un minuto antes de volver a enviar.'); }
ftruncate($lock, 0); rewind($lock); fwrite($lock, (string)time()); fflush($lock); flock($lock, LOCK_UN); fclose($lock);
// Bound outgoing volume across IPs. The hosting should also enforce request limits.
$globalPath = sys_get_temp_dir() . '/m20-global-' . hash('sha256', __DIR__);
$globalLock = @fopen($globalPath, 'c+');
if (!$globalLock || !flock($globalLock, LOCK_EX)) respond(503, false, 'El envío no está disponible. Intentá más tarde.');
$rate = json_decode(stream_get_contents($globalLock), true);
$hour = (int)floor(time() / 3600);
$count = is_array($rate) && ($rate['hour'] ?? 0) === $hour ? (int)($rate['count'] ?? 0) : 0;
if ($count >= 100) { fclose($globalLock); respond(429, false, 'Se alcanzó el límite de envíos. Intentá más tarde.'); }
ftruncate($globalLock, 0); rewind($globalLock); fwrite($globalLock, json_encode(['hour' => $hour, 'count' => $count + 1])); fflush($globalLock); flock($globalLock, LOCK_UN); fclose($globalLock);
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
if (!function_exists('mail') || !@mail($config[$kind], '=?UTF-8?B?' . base64_encode($subject) . '?=', $message, $headers)) respond(503, false, 'El servidor no pudo enviar el mensaje. Intentá más tarde.');
respond(200, true, $kind === 'careers' ? 'Tu postulación fue enviada. Gracias por compartir tu CV.' : 'Tu consulta fue enviada. Gracias por escribirnos.');

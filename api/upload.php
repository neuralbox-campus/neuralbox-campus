<?php
// ============================================
// NEURALBOX - SUBIDA DE ARCHIVOS
// Archivo: /public_html/api/upload.php
// ============================================

require_once 'config.php';
setHeaders();

$user = authRequired();

// Solo admin puede subir archivos
if ($user['rol'] !== 'admin') {
    error('Solo administradores pueden subir archivos', 403);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    error('Método no permitido', 405);
}

if (!isset($_FILES['file'])) {
    error('No se recibió ningún archivo');
}

$file     = $_FILES['file'];
$maxSize  = 10 * 1024 * 1024; // 10MB
$allowed  = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

// Validaciones
if ($file['error'] !== UPLOAD_ERR_OK) {
    error('Error al subir el archivo: ' . $file['error']);
}
if ($file['size'] > $maxSize) {
    error('El archivo es demasiado grande (máx 10MB)');
}
if (!in_array($file['type'], $allowed)) {
    error('Tipo de archivo no permitido. Solo imágenes JPG, PNG, GIF, WEBP');
}

// Crear carpeta uploads si no existe
$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Nombre único para el archivo
$ext      = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'img_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
$destPath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    error('No se pudo guardar el archivo en el servidor');
}

// URL pública
$baseUrl  = rtrim(CAMPUS_URL, '/');
$imageUrl = $baseUrl . '/uploads/' . $filename;

success([
    'url'      => $imageUrl,
    'filename' => $filename,
    'size'     => $file['size'],
    'type'     => $file['type'],
]);

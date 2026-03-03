<?php
// ============================================
// NEURALBOX - CRON: Expirar suscripciones
// Ejecutar cada hora via Hostinger Cron Jobs
// URL: https://campus.neuralboxai.com/api/cron_expire.php?key=TU_CLAVE_SECRETA
// Hostinger → Advanced → Cron Jobs → cada hora
// ============================================

require_once 'config.php';

// Seguridad básica: clave secreta en URL
$clave = $_GET['key'] ?? '';
define('CRON_KEY', 'neuralbox_cron_2026'); // ← Cambia esto

if ($clave !== CRON_KEY) {
    http_response_code(403);
    die(json_encode(['error' => 'No autorizado']));
}

$db = getDB();

// 1. Expirar usuarios cuyo acceso venció (via código)
// Buscar usuarios con acceso activo pero código vencido
$stmt = $db->query('
    SELECT u.id, u.username
    FROM usuarios u
    JOIN codigos_acceso c ON c.usuario_id = u.id
    WHERE u.acceso_campus = 1
    AND c.fecha_expira IS NOT NULL
    AND c.fecha_expira < NOW()
');
$vencidos = $stmt->fetchAll();

$count = 0;
foreach ($vencidos as $u) {
    $db->prepare('UPDATE usuarios SET acceso_campus = 0, paquete = NULL WHERE id = ?')
       ->execute([$u['id']]);
    
    // Invalidar sesiones activas para que al recargar vean SinConexión
    // (No las eliminamos para que el progreso se conserve)
    $count++;
}

// 2. Log resultado
$resultado = [
    'timestamp' => date('Y-m-d H:i:s'),
    'usuarios_expirados' => $count,
    'usuarios_afectados' => array_column($vencidos, 'username'),
];

// Guardar log en configuracion
$db->prepare("INSERT INTO configuracion (clave, valor) VALUES ('ultimo_cron_expire', ?) ON DUPLICATE KEY UPDATE valor = ?")
   ->execute([json_encode($resultado), json_encode($resultado)]);

echo json_encode(['success' => true, 'resultado' => $resultado]);

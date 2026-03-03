<?php
// ============================================
// NEURALBOX - LEADS PREVENTA
// Archivo: /public_html/api/leads.php
// ============================================

require_once 'config.php';
setHeaders();

$body   = getBody();
$db     = getDB();
$action = $_GET['action'] ?? 'save';

// ── Crear tabla si no existe ──────────────────
try {
    $db->query('SELECT id FROM leads_preventa LIMIT 1');
} catch (Exception $e) {
    $db->query('
        CREATE TABLE IF NOT EXISTS leads_preventa (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nombre VARCHAR(100) DEFAULT NULL,
          email VARCHAR(200) NOT NULL,
          telefono VARCHAR(30) DEFAULT NULL,
          estado ENUM("interesado","pago_iniciado","pagado","fallido") DEFAULT "interesado",
          metodo_pago VARCHAR(50) DEFAULT NULL,
          mp_operacion VARCHAR(100) DEFAULT NULL,
          mp_monto DECIMAL(10,2) DEFAULT NULL,
          fuente VARCHAR(50) DEFAULT "landing",
          ip VARCHAR(45) DEFAULT NULL,
          notas TEXT DEFAULT NULL,
          sheets_sync TINYINT(1) DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uk_email (email)
        )
    ');
}

// ── GET: listar leads (solo admin) ────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'list') {
    $admin = adminRequired();
    $estado = $_GET['estado'] ?? '';
    if ($estado) {
        $stmt = $db->prepare('SELECT * FROM leads_preventa WHERE estado = ? ORDER BY created_at DESC');
        $stmt->execute([$estado]);
    } else {
        $stmt = $db->query('SELECT * FROM leads_preventa ORDER BY created_at DESC');
    }
    $leads = $stmt->fetchAll();

    // Stats
    $stats = [
        'total'         => 0,
        'interesados'   => 0,
        'pago_iniciado' => 0,
        'pagados'       => 0,
        'fallidos'      => 0,
    ];
    $all = $db->query('SELECT estado, COUNT(*) as n FROM leads_preventa GROUP BY estado')->fetchAll();
    foreach ($all as $row) {
        $stats['total'] += $row['n'];
        if (isset($stats[$row['estado']])) $stats[$row['estado']] = $row['n'];
    }

    success(['leads' => $leads, 'stats' => $stats]);
    exit;
}

// ── POST: guardar o actualizar lead ──────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') error('Método no permitido', 405);

$email    = strtolower(trim($body['email'] ?? ''));
$nombre   = trim($body['nombre'] ?? '');
$telefono = trim($body['telefono'] ?? '');
$estado   = $body['estado'] ?? 'interesado';
$fuente   = $body['fuente'] ?? 'landing';
$metodo   = $body['metodo_pago'] ?? null;
$operacion = $body['mp_operacion'] ?? null;
$monto    = isset($body['mp_monto']) ? floatval($body['mp_monto']) : null;
$notas    = trim($body['notas'] ?? '');
$ip       = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;

if (!$email) error('Email requerido');

// Upsert: si ya existe actualiza estado si es "mejor" (más avanzado)
$orden = ['interesado' => 1, 'pago_iniciado' => 2, 'pagado' => 3, 'fallido' => 2];
$existing = $db->prepare('SELECT id, estado FROM leads_preventa WHERE email = ?');
$existing->execute([$email]);
$lead = $existing->fetch();

if ($lead) {
    // Solo actualiza si el nuevo estado es igual o más avanzado
    $actualOrder   = $orden[$lead['estado']] ?? 0;
    $newOrder      = $orden[$estado] ?? 0;
    $updateEstado  = $newOrder >= $actualOrder ? $estado : $lead['estado'];

    $fields  = 'estado=?, updated_at=NOW()';
    $params  = [$updateEstado];
    if ($nombre)    { $fields .= ', nombre=?';    $params[] = $nombre; }
    if ($telefono)  { $fields .= ', telefono=?';  $params[] = $telefono; }
    if ($metodo)    { $fields .= ', metodo_pago=?'; $params[] = $metodo; }
    if ($operacion) { $fields .= ', mp_operacion=?'; $params[] = $operacion; }
    if ($monto)     { $fields .= ', mp_monto=?';  $params[] = $monto; }
    if ($notas)     { $fields .= ', notas=?';     $params[] = $notas; }
    $params[] = $email;

    $db->prepare("UPDATE leads_preventa SET $fields WHERE email=?")->execute($params);
    $leadId = $lead['id'];
} else {
    $db->prepare('
        INSERT INTO leads_preventa (nombre, email, telefono, estado, metodo_pago, mp_operacion, mp_monto, fuente, ip, notas)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    ')->execute([$nombre, $email, $telefono, $estado, $metodo, $operacion, $monto, $fuente, $ip, $notas]);
    $leadId = $db->lastInsertId();
}

// ── Sync a Google Sheets (si está configurado) ──
$sheetsUrl = 'https://script.google.com/macros/s/AKfycbyVB8nQ0_suHT6ful0o0-1EWfUtvyxHQhVyi8RgbJ7GWvdAQQqK30H93Qndfyg20x5h/exec';

if ($sheetsUrl) {
    try {
        $ch = curl_init($sheetsUrl);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'nombre'    => $nombre,
            'email'     => $email,
            'telefono'  => $telefono,
            'estado'    => $estado,
            'fuente'    => $fuente,
            'notas'     => $notas,
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_exec($ch);
        curl_close($ch);
        $db->prepare('UPDATE leads_preventa SET sheets_sync=1 WHERE id=?')->execute([$leadId]);
    } catch(Exception $e) {}
}

success(['message' => 'Lead guardado', 'id' => $leadId, 'estado' => $estado]);
<?php
// ============================================
// NEURALBOX - AUTENTICACIÓN
// Archivo: /public_html/api/auth.php
// Endpoints: POST /api/auth.php?action=login|register|logout|me
// ============================================

require_once 'config.php';
setHeaders();

$action = $_GET['action'] ?? '';
$body = getBody();

switch ($action) {

    // ── LOGIN ──────────────────────────────────
    case 'login':
        $username = strtolower(trim($body['username'] ?? ''));
        $password = $body['password'] ?? '';

        if (empty($username) || empty($password)) {
            error('Usuario y contraseña son requeridos');
        }

        $db = getDB();
        $stmt = $db->prepare('SELECT * FROM usuarios WHERE (username = ? OR email = ?) AND activo = 1');
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            error('Usuario o contraseña incorrectos', 401);
        }

        // Crear sesión
        $token = generateToken();
        $expires = date('Y-m-d H:i:s', time() + SESSION_DURATION);
        $ip = $_SERVER['REMOTE_ADDR'] ?? '';
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

        $stmt = $db->prepare('INSERT INTO sesiones (id, usuario_id, ip, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)');
        $stmt->execute([$token, $user['id'], $ip, $ua, $expires]);

        // Actualizar último login
        $db->prepare('UPDATE usuarios SET last_login = NOW() WHERE id = ?')->execute([$user['id']]);

        // Obtener progreso
        $stmt = $db->prepare('SELECT leccion_id FROM progreso WHERE usuario_id = ? AND completada = 1');
        $stmt->execute([$user['id']]);
        $done = array_column($stmt->fetchAll(), 'leccion_id');

        // Obtener roles
        $stmt = $db->prepare('SELECT rol_nombre, rol_color FROM roles_usuario WHERE usuario_id = ?');
        $stmt->execute([$user['id']]);
        $roles = $stmt->fetchAll();

        success([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'emoji' => $user['emoji'],
                'xp' => $user['xp'],
                'nivel' => $user['nivel'],
                'rol' => $user['rol'],
                'acceso_campus' => (bool)$user['acceso_campus'],
                'paquete' => $user['paquete'],
                'done' => $done,
                'roles' => $roles,
            ]
        ]);
        break;

    // ── REGISTER ───────────────────────────────
    case 'register':
        $username = strtolower(trim(preg_replace('/\s+/', '_', $body['username'] ?? '')));
        $email = strtolower(trim($body['email'] ?? ''));
        $password = $body['password'] ?? '';

        if (empty($username) || empty($email) || empty($password)) {
            error('Todos los campos son requeridos');
        }

        if (strlen($username) < 3) {
            error('El nombre de usuario debe tener mínimo 3 caracteres');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            error('Email inválido');
        }

        if (strlen($password) < 6) {
            error('La contraseña debe tener mínimo 6 caracteres');
        }

        $db = getDB();

        // Verificar si ya existe
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE username = ? OR email = ?');
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            error('El nombre de usuario o email ya está en uso');
        }

        // Verificar código de acceso si se proporcionó
        $codigo = strtoupper(trim($body['codigo'] ?? ''));
        $acceso_campus = 0;
        $paquete = null;
        $fecha_expira_acceso = null;

        if ($codigo) {
            $stmt = $db->prepare('SELECT * FROM codigos_acceso WHERE codigo = ? AND usado = 0');
            $stmt->execute([$codigo]);
            $cod = $stmt->fetch();
            if (!$cod) {
                error('Código de acceso inválido o ya usado');
            }
            $acceso_campus = 1;
            $paquete = $cod['tipo'];
            $fecha_expira_acceso = date('Y-m-d H:i:s', time() + ($cod['duracion_dias'] * 86400));
        }

        // Crear usuario
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO usuarios (username, email, password_hash, emoji, xp, rol, activo, acceso_campus, paquete) VALUES (?, ?, ?, ?, 0, "estudiante", 1, ?, ?)');
        $stmt->execute([$username, $email, $hash, '🧑‍💻', $acceso_campus, $paquete]);
        $userId = $db->lastInsertId();

        // Redimir código si se usó
        if ($codigo && isset($cod)) {
            $db->prepare('UPDATE codigos_acceso SET usado=1, usuario_id=?, fecha_uso=NOW(), fecha_expira=? WHERE id=?')
               ->execute([$userId, $fecha_expira_acceso, $cod['id']]);
        }

        // Crear sesión
        $token = generateToken();
        $expires = date('Y-m-d H:i:s', time() + SESSION_DURATION);
        $db->prepare('INSERT INTO sesiones (id, usuario_id, expires_at) VALUES (?, ?, ?)')->execute([$token, $userId, $expires]);

        success([
            'token' => $token,
            'user' => [
                'id' => $userId,
                'username' => $username,
                'email' => $email,
                'emoji' => '🧑‍💻',
                'xp' => 0,
                'nivel' => 1,
                'rol' => 'estudiante',
                'acceso_campus' => (bool)$acceso_campus,
                'paquete' => $paquete,
                'done' => [],
                'roles' => [],
                'codigo_aplicado' => $codigo ?: null,
            ]
        ], 201);
        break;

    // ── ME (obtener usuario actual) ─────────────
    case 'me':
        $user = authRequired();
        $db = getDB();

        // Progreso
        $stmt = $db->prepare('SELECT leccion_id FROM progreso WHERE usuario_id = ? AND completada = 1');
        $stmt->execute([$user['usuario_id']]);
        $done = array_column($stmt->fetchAll(), 'leccion_id');

        // Roles
        $stmt = $db->prepare('SELECT rol_nombre, rol_color FROM roles_usuario WHERE usuario_id = ?');
        $stmt->execute([$user['usuario_id']]);
        $roles = $stmt->fetchAll();

        // XP y nivel actualizados
        $stmt = $db->prepare('SELECT xp, nivel, emoji FROM usuarios WHERE id = ?');
        $stmt->execute([$user['usuario_id']]);
        $fresh = $stmt->fetch();

        success([
            'id' => $user['usuario_id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'emoji' => $fresh['emoji'],
            'xp' => $fresh['xp'],
            'nivel' => $fresh['nivel'],
            'rol' => $user['rol'],
            'acceso_campus' => (bool)$user['acceso_campus'],
            'paquete' => $user['paquete'],
            'done' => $done,
            'roles' => $roles,
        ]);
        break;

    // ── LOGOUT ─────────────────────────────────
    case 'logout':
        $headers = getallheaders();
        $token = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
        if ($token) {
            getDB()->prepare('DELETE FROM sesiones WHERE id = ?')->execute([$token]);
        }
        success(['message' => 'Sesión cerrada']);
        break;

    // ── UPDATE PROFILE ──────────────────────────
    case 'update_profile':
        $user = authRequired();
        $db = getDB();

        $emoji = $body['emoji'] ?? null;
        $username = strtolower(trim(preg_replace('/\s+/', '_', $body['username'] ?? '')));

        if ($username && strlen($username) >= 3) {
            // Verificar que no esté en uso por otro
            $stmt = $db->prepare('SELECT id FROM usuarios WHERE username = ? AND id != ?');
            $stmt->execute([$username, $user['usuario_id']]);
            if ($stmt->fetch()) {
                error('Ese nombre de usuario ya está en uso');
            }
            $db->prepare('UPDATE usuarios SET username = ? WHERE id = ?')->execute([$username, $user['usuario_id']]);
        }

        if ($emoji) {
            $db->prepare('UPDATE usuarios SET emoji = ? WHERE id = ?')->execute([$emoji, $user['usuario_id']]);
        }

        success(['message' => 'Perfil actualizado']);
        break;

    default:
        error('Acción no válida', 404);
}

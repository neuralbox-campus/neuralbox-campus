<?php
// ============================================
// NEURALBOX - PANEL ADMIN API
// Archivo: /public_html/api/admin.php
// ============================================

require_once 'config.php';
setHeaders();

$admin = adminRequired();
$action = $_GET['action'] ?? '';
$body = getBody();
$db = getDB();

switch ($action) {

    // ══ DASHBOARD ══════════════════════════════
    case 'dashboard':
        $stats = [];
        $stats['total_usuarios'] = $db->query('SELECT COUNT(*) FROM usuarios WHERE rol != "admin"')->fetchColumn();
        $stats['activos_hoy'] = $db->query('SELECT COUNT(DISTINCT usuario_id) FROM sesiones WHERE created_at >= CURDATE()')->fetchColumn();
        $stats['lecciones_completadas'] = $db->query('SELECT COUNT(*) FROM progreso WHERE completada = 1')->fetchColumn();
        $stats['xp_promedio'] = round($db->query('SELECT AVG(xp) FROM usuarios WHERE rol = "estudiante"')->fetchColumn());
        $stats['total_pagos'] = $db->query('SELECT COUNT(*) FROM pagos WHERE estado = "completado"')->fetchColumn();
        $stats['ingresos_total'] = $db->query('SELECT SUM(monto) FROM pagos WHERE estado = "completado"')->fetchColumn() ?? 0;

        // Top 5 usuarios
        $top = $db->query('SELECT username, emoji, xp, nivel FROM usuarios WHERE rol = "estudiante" ORDER BY xp DESC LIMIT 5')->fetchAll();

        // Actividad reciente
        $actividad = $db->query('
            SELECT u.username, u.emoji, l.titulo as leccion, m.titulo as modulo, p.fecha_completado
            FROM progreso p
            JOIN usuarios u ON p.usuario_id = u.id
            JOIN lecciones l ON p.leccion_id = l.id
            JOIN modulos m ON l.modulo_id = m.id
            WHERE p.completada = 1
            ORDER BY p.fecha_completado DESC LIMIT 10
        ')->fetchAll();

        success(['stats' => $stats, 'top_usuarios' => $top, 'actividad' => $actividad]);
        break;

    // ══ MÓDULOS ════════════════════════════════
    case 'get_modules':
        $stmt = $db->query('
            SELECT m.*, COUNT(l.id) as total_lecciones
            FROM modulos m
            LEFT JOIN lecciones l ON m.id = l.modulo_id
            GROUP BY m.id ORDER BY m.orden ASC
        ');
        success(['modulos' => $stmt->fetchAll()]);
        break;

    case 'save_module':
        $id = intval($body['id'] ?? 0);
        $titulo = trim($body['titulo'] ?? '');
        $descripcion = trim($body['descripcion'] ?? '');
        $icono = trim($body['icono'] ?? '📚');
        $orden = intval($body['orden'] ?? 0);
        $rol_desbloquea = trim($body['rol_desbloquea'] ?? '');
        $rol_color = trim($body['rol_color'] ?? '#a6c6d9');
        $activo = intval($body['activo'] ?? 1);

        if (empty($titulo)) error('El título es requerido');

        if ($id) {
            $db->prepare('UPDATE modulos SET titulo=?, descripcion=?, icono=?, orden=?, rol_desbloquea=?, rol_color=?, activo=? WHERE id=?')
               ->execute([$titulo, $descripcion, $icono, $orden, $rol_desbloquea, $rol_color, $activo, $id]);
            success(['message' => 'Módulo actualizado', 'id' => $id]);
        } else {
            $slug = 'm' . time();
            $db->prepare('INSERT INTO modulos (slug, titulo, descripcion, icono, orden, rol_desbloquea, rol_color, activo) VALUES (?,?,?,?,?,?,?,?)')
               ->execute([$slug, $titulo, $descripcion, $icono, $orden, $rol_desbloquea, $rol_color, $activo]);
            success(['message' => 'Módulo creado', 'id' => $db->lastInsertId()], 201);
        }
        break;

    case 'delete_module':
        $id = intval($body['id'] ?? 0);
        if (!$id) error('ID requerido');
        $db->prepare('DELETE FROM modulos WHERE id = ?')->execute([$id]);
        success(['message' => 'Módulo eliminado']);
        break;

    // ══ LECCIONES ══════════════════════════════
    case 'get_lessons':
        $modulo_id = intval($_GET['modulo_id'] ?? 0);
        if ($modulo_id) {
            $stmt = $db->prepare('SELECT * FROM lecciones WHERE modulo_id = ? ORDER BY orden ASC');
            $stmt->execute([$modulo_id]);
        } else {
            $stmt = $db->query('SELECT l.*, m.titulo as modulo_titulo FROM lecciones l JOIN modulos m ON l.modulo_id = m.id ORDER BY m.orden, l.orden');
        }
        success(['lecciones' => $stmt->fetchAll()]);
        break;

    case 'save_lesson':
        $id = intval($body['id'] ?? 0);
        $modulo_id = intval($body['modulo_id'] ?? 0);
        $titulo = trim($body['titulo'] ?? '');
        $tipo = $body['tipo'] ?? 'video';
        $duracion = trim($body['duracion'] ?? '10 min');
        $xp = intval($body['xp'] ?? 50);
        $video_url = trim($body['video_url'] ?? '');
        $contenido = trim($body['contenido'] ?? '');
        $orden = intval($body['orden'] ?? 0);
        $activo = intval($body['activo'] ?? 1);

        if (empty($titulo) || !$modulo_id) error('Título y módulo son requeridos');

        if ($id) {
            $db->prepare('UPDATE lecciones SET modulo_id=?, titulo=?, tipo=?, duracion=?, xp=?, video_url=?, contenido=?, orden=?, activo=? WHERE id=?')
               ->execute([$modulo_id, $titulo, $tipo, $duracion, $xp, $video_url, $contenido, $orden, $activo, $id]);
            success(['message' => 'Lección actualizada', 'id' => $id]);
        } else {
            $slug = 'l' . time();
            $db->prepare('INSERT INTO lecciones (modulo_id, slug, titulo, tipo, duracion, xp, video_url, contenido, orden, activo) VALUES (?,?,?,?,?,?,?,?,?,?)')
               ->execute([$modulo_id, $slug, $titulo, $tipo, $duracion, $xp, $video_url, $contenido, $orden, $activo]);
            success(['message' => 'Lección creada', 'id' => $db->lastInsertId()], 201);
        }
        break;

    case 'delete_lesson':
        $id = intval($body['id'] ?? 0);
        if (!$id) error('ID requerido');
        $db->prepare('DELETE FROM lecciones WHERE id = ?')->execute([$id]);
        success(['message' => 'Lección eliminada']);
        break;

    // ══ USUARIOS ═══════════════════════════════
    case 'get_users':
        $search = trim($_GET['search'] ?? '');
        $rol = $_GET['rol'] ?? '';
        $sql = 'SELECT u.id, u.username, u.email, u.emoji, u.xp, u.nivel, u.rol, u.activo, u.acceso_campus, u.paquete, u.created_at, u.last_login,
                COUNT(p.id) as lecciones_completadas
                FROM usuarios u
                LEFT JOIN progreso p ON u.id = p.usuario_id AND p.completada = 1';
        $params = [];
        $where = [];
        if ($search) { $where[] = '(u.username LIKE ? OR u.email LIKE ?)'; $params[] = "%$search%"; $params[] = "%$search%"; }
        if ($rol) { $where[] = 'u.rol = ?'; $params[] = $rol; }
        if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
        $sql .= ' GROUP BY u.id ORDER BY u.xp DESC';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        success(['usuarios' => $stmt->fetchAll()]);
        break;

    case 'save_user':
        $id = intval($body['id'] ?? 0);
        $username = strtolower(trim($body['username'] ?? ''));
        $email = strtolower(trim($body['email'] ?? ''));
        $xp = intval($body['xp'] ?? 0);
        $rol = $body['rol'] ?? 'estudiante';
        $activo = intval($body['activo'] ?? 1);
        $acceso_campus = intval($body['acceso_campus'] ?? 0);
        $paquete = $body['paquete'] ?? null;
        $password = $body['password'] ?? '';

        if (!$username || !$email) error('Usuario y email requeridos');

        if ($id) {
            $fields = 'username=?, email=?, xp=?, nivel=FLOOR(?/200)+1, rol=?, activo=?, acceso_campus=?, paquete=?';
            $params = [$username, $email, $xp, $xp, $rol, $activo, $acceso_campus, $paquete];
            if ($password) { $fields .= ', password_hash=?'; $params[] = password_hash($password, PASSWORD_DEFAULT); }
            $params[] = $id;
            $db->prepare("UPDATE usuarios SET $fields WHERE id=?")->execute($params);
            success(['message' => 'Usuario actualizado']);
        } else {
            if (!$password) error('Contraseña requerida para nuevo usuario');
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $db->prepare('INSERT INTO usuarios (username, email, password_hash, xp, rol, activo, acceso_campus, paquete) VALUES (?,?,?,?,?,?,?,?)')
               ->execute([$username, $email, $hash, $xp, $rol, $activo, $acceso_campus, $paquete]);
            success(['message' => 'Usuario creado', 'id' => $db->lastInsertId()], 201);
        }
        break;

    case 'delete_user':
        $id = intval($body['id'] ?? 0);
        if (!$id) error('ID requerido');
        if ($id == $admin['usuario_id']) error('No puedes eliminarte a ti mismo');
        $db->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$id]);
        success(['message' => 'Usuario eliminado']);
        break;

    case 'grant_access':
        $id = intval($body['usuario_id'] ?? 0);
        $paquete = $body['paquete'] ?? 'box';
        if (!$id) error('usuario_id requerido');
        $db->prepare('UPDATE usuarios SET acceso_campus = 1, paquete = ? WHERE id = ?')->execute([$paquete, $id]);
        success(['message' => 'Acceso otorgado']);
        break;

    case 'revoke_access':
        $id = intval($body['usuario_id'] ?? 0);
        if (!$id) error('usuario_id requerido');
        $db->prepare('UPDATE usuarios SET acceso_campus = 0, paquete = NULL WHERE id = ?')->execute([$id]);
        success(['message' => 'Acceso revocado']);
        break;

    // ══ ROLES ══════════════════════════════════
    case 'get_roles':
        $stmt = $db->query('SELECT m.id, m.titulo, m.rol_desbloquea, m.rol_color FROM modulos m WHERE m.rol_desbloquea IS NOT NULL AND m.rol_desbloquea != ""');
        success(['roles' => $stmt->fetchAll()]);
        break;

    case 'update_role':
        $modulo_id = intval($body['modulo_id'] ?? 0);
        $rol_nombre = trim($body['rol_nombre'] ?? '');
        $rol_color = trim($body['rol_color'] ?? '#a6c6d9');
        if (!$modulo_id || !$rol_nombre) error('Datos incompletos');
        $db->prepare('UPDATE modulos SET rol_desbloquea=?, rol_color=? WHERE id=?')->execute([$rol_nombre, $rol_color, $modulo_id]);
        success(['message' => 'Rol actualizado']);
        break;

    // ══ ANUNCIOS ═══════════════════════════════
    case 'get_announces':
        $canal = $_GET['canal'] ?? 'anuncios';
        $stmt = $db->prepare('
            SELECT a.*, u.username, u.emoji,
            (SELECT COUNT(*) FROM reacciones r WHERE r.anuncio_id = a.id) as total_reacciones
            FROM anuncios a JOIN usuarios u ON a.publicado_por = u.id
            WHERE a.canal = ? AND a.activo = 1 ORDER BY a.created_at DESC
        ');
        $stmt->execute([$canal]);
        $posts = $stmt->fetchAll();

        foreach ($posts as &$post) {
            $stmt2 = $db->prepare('SELECT emoji, COUNT(*) as count FROM reacciones WHERE anuncio_id = ? GROUP BY emoji');
            $stmt2->execute([$post['id']]);
            $post['reacciones'] = $stmt2->fetchAll();
        }
        success(['posts' => $posts]);
        break;

    case 'post_announce':
        $canal      = $body['canal'] ?? 'anuncios';
        $texto      = trim($body['texto'] ?? '');
        $imagen_url = trim($body['imagen_url'] ?? '');
        $video_url  = trim($body['video_url'] ?? '');

        if (empty($texto)) error('El texto es requerido');

        // Safe migration: add missing columns if needed
        try { $db->query('ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS video_url VARCHAR(500) DEFAULT NULL'); } catch(Exception $e){}
        try { $db->query('ALTER TABLE anuncios ADD COLUMN IF NOT EXISTS activo TINYINT(1) DEFAULT 1'); } catch(Exception $e){}

        $db->prepare('INSERT INTO anuncios (canal, texto, imagen_url, video_url, publicado_por, activo) VALUES (?,?,?,?,?,1)')
           ->execute([$canal, $texto, $imagen_url ?: null, $video_url ?: null, $admin['usuario_id']]);

        success(['message' => 'Publicado', 'id' => $db->lastInsertId()], 201);
        break;

    case 'delete_announce':
        $id = intval($body['id'] ?? 0);
        if (!$id) error('ID requerido');
        $db->prepare('UPDATE anuncios SET activo = 0 WHERE id = ?')->execute([$id]);
        success(['message' => 'Eliminado']);
        break;

    // ══ PAGOS ══════════════════════════════════
    case 'get_payments':
        $stmt = $db->query('
            SELECT p.*, u.username, u.email as user_email
            FROM pagos p LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.created_at DESC LIMIT 100
        ');
        success(['pagos' => $stmt->fetchAll()]);
        break;

    case 'manual_payment':
        $email = strtolower(trim($body['email'] ?? ''));
        $monto = floatval($body['monto'] ?? 0);
        $paquete = $body['paquete'] ?? 'box';
        $nota = trim($body['nota'] ?? '');
        if (!$email || !$monto) error('Email y monto requeridos');

        // Buscar usuario por email
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
        $stmt->execute([$email]);
        $u = $stmt->fetch();

        $db->prepare('INSERT INTO pagos (usuario_id, email, monto, metodo, estado, paquete, datos_extra) VALUES (?,?,?,"manual","completado",?,?)')
           ->execute([$u['id'] ?? null, $email, $monto, $paquete, json_encode(['nota' => $nota])]);

        // Si existe el usuario, darle acceso
        if ($u) {
            $db->prepare('UPDATE usuarios SET acceso_campus = 1, paquete = ? WHERE id = ?')->execute([$paquete, $u['id']]);
        }
        success(['message' => 'Pago manual registrado']);
        break;

    // ══ CONFIGURACIÓN ══════════════════════════
    case 'get_config':
        $stmt = $db->query('SELECT clave, valor FROM configuracion');
        $config = [];
        foreach ($stmt->fetchAll() as $row) $config[$row['clave']] = $row['valor'];
        success(['config' => $config]);
        break;

    case 'save_config':
        foreach ($body as $clave => $valor) {
            $db->prepare('INSERT INTO configuracion (clave, valor) VALUES (?,?) ON DUPLICATE KEY UPDATE valor=?')
               ->execute([$clave, $valor, $valor]);
        }
        success(['message' => 'Configuración guardada']);
        break;

    // ══ LEADERBOARD ════════════════════════════
    case 'leaderboard':
        $limite = intval($_GET['limite'] ?? 10);
        $stmt = $db->prepare('
            SELECT u.username, u.emoji, u.xp, u.nivel,
            COUNT(p.id) as lecciones_completadas
            FROM usuarios u
            LEFT JOIN progreso p ON u.id = p.usuario_id AND p.completada = 1
            WHERE u.rol = "estudiante" AND u.activo = 1
            GROUP BY u.id ORDER BY u.xp DESC LIMIT ?
        ');
        $stmt->execute([$limite]);
        success(['leaderboard' => $stmt->fetchAll()]);
        break;

    // ══ CÓDIGOS DE ACCESO ══════════════════════
    case 'get_codes':
        $stmt = $db->query('
            SELECT c.*, u.username as usado_por
            FROM codigos_acceso c
            LEFT JOIN usuarios u ON c.usuario_id = u.id
            ORDER BY c.created_at DESC LIMIT 200
        ');
        success(['codigos' => $stmt->fetchAll()]);
        break;

    case 'generate_codes':
        $cantidad = min(intval($body['cantidad'] ?? 1), 100);
        $tipo = $body['tipo'] ?? 'preventa';
        $duracion = intval($body['duracion_dias'] ?? 365);
        $notas = trim($body['notas'] ?? '');

        $duraciones = ['mensual'=>30,'semestral'=>180,'anual'=>365,'preventa'=>365,'regalo'=>365];
        if (isset($duraciones[$tipo])) $duracion = $duraciones[$tipo];

        $generados = [];
        for ($i = 0; $i < $cantidad; $i++) {
            $codigo = 'NB-' . strtoupper(substr(md5(uniqid(rand(), true)), 0, 8));
            $db->prepare('INSERT INTO codigos_acceso (codigo, tipo, duracion_dias, creado_por, notas) VALUES (?,?,?,?,?)')
               ->execute([$codigo, $tipo, $duracion, $admin['usuario_id'], $notas]);
            $generados[] = $codigo;
        }
        success(['codigos' => $generados, 'cantidad' => $cantidad]);
        break;

    case 'delete_code':
        $id = intval($body['id'] ?? 0);
        if (!$id) error('ID requerido');
        $db->prepare('DELETE FROM codigos_acceso WHERE id = ? AND usado = 0')->execute([$id]);
        success(['message' => 'Código eliminado']);
        break;
    // ══ CANALES Y CATEGORÍAS ══════════════════
    case 'get_canales':
        $stmt = $db->query('SELECT * FROM canales ORDER BY orden ASC, id ASC');
        success(['canales' => $stmt->fetchAll()]);
        break;

    case 'save_canal':
        $id           = intval($body['id'] ?? 0);
        $tipo         = $body['tipo'] ?? 'canal';
        $nombre       = trim($body['nombre'] ?? '');
        $icono        = trim($body['icono'] ?? '💬');
        $tab_destino  = trim($body['tab_destino'] ?? '');
        $categoria_id = intval($body['categoria_id'] ?? 0) ?: null;
        $orden        = intval($body['orden'] ?? 0);
        $visible      = intval($body['visible'] ?? 1);
        if (empty($nombre)) error('Nombre requerido');
        if ($id) {
            $db->prepare('UPDATE canales SET tipo=?,nombre=?,icono=?,tab_destino=?,categoria_id=?,orden=?,visible=? WHERE id=?')
               ->execute([$tipo,$nombre,$icono,$tab_destino?:null,$categoria_id,$orden,$visible,$id]);
            success(['message'=>'Actualizado','id'=>$id]);
        } else {
            $db->prepare('INSERT INTO canales (tipo,nombre,icono,tab_destino,categoria_id,orden,visible) VALUES (?,?,?,?,?,?,?)')
               ->execute([$tipo,$nombre,$icono,$tab_destino?:null,$categoria_id,$orden,$visible]);
            success(['message'=>'Creado','id'=>$db->lastInsertId()],201);
        }
        break;

    case 'delete_canal':
        $id = intval($body['id'] ?? 0);
        if (!$id) error('ID requerido');
        $db->prepare('DELETE FROM canales WHERE id=?')->execute([$id]);
        success(['message'=>'Eliminado']);
        break;

    case 'toggle_canal':
        $id      = intval($body['id'] ?? 0);
        $visible = intval($body['visible'] ?? 1);
        if (!$id) error('ID requerido');
        $db->prepare('UPDATE canales SET visible=? WHERE id=?')->execute([$visible,$id]);
        success(['message'=>'Visibilidad actualizada']);
        break;
    default:
        error('Acción no válida: ' . $action, 404);
}
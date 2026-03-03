<?php
// ============================================
// NEURALBOX - PROGRESO DE LECCIONES
// Archivo: /public_html/api/progress.php
// ============================================

require_once 'config.php';
setHeaders();

$user = authRequired();
$action = $_GET['action'] ?? 'get';
$body = getBody();
$db = getDB();

switch ($action) {

    // ── OBTENER PROGRESO COMPLETO ───────────────
    case 'get':
        $stmt = $db->prepare('
            SELECT p.leccion_id, p.completada, p.xp_ganado, p.fecha_completado,
                   l.slug, l.titulo, l.tipo, l.xp as xp_total
            FROM progreso p
            JOIN lecciones l ON p.leccion_id = l.id
            WHERE p.usuario_id = ?
        ');
        $stmt->execute([$user['usuario_id']]);
        $progreso = $stmt->fetchAll();

        $stmt2 = $db->prepare('SELECT xp, nivel FROM usuarios WHERE id = ?');
        $stmt2->execute([$user['usuario_id']]);
        $stats = $stmt2->fetch();

        success([
            'progreso' => $progreso,
            'xp' => $stats['xp'],
            'nivel' => $stats['nivel'],
        ]);
        break;

    // ── COMPLETAR LECCIÓN ──────────────────────
    case 'complete':
        $leccion_id = intval($body['leccion_id'] ?? 0);

        if (!$leccion_id) error('leccion_id requerido');
        if (!(bool)$user['acceso_campus']) error('Sin acceso al campus', 403);

        // Verificar que la lección existe
        $stmt = $db->prepare('SELECT id, xp, modulo_id FROM lecciones WHERE id = ? AND activo = 1');
        $stmt->execute([$leccion_id]);
        $leccion = $stmt->fetch();
        if (!$leccion) error('Lección no encontrada', 404);

        // Verificar si ya estaba completada
        $stmt = $db->prepare('SELECT id, completada FROM progreso WHERE usuario_id = ? AND leccion_id = ?');
        $stmt->execute([$user['usuario_id'], $leccion_id]);
        $existing = $stmt->fetch();

        if ($existing && $existing['completada']) {
            success(['message' => 'Ya completada', 'already_done' => true]);
        }

        // Verificar que la lección anterior esté completada (desbloqueo secuencial)
        $stmt = $db->prepare('
            SELECT l.id FROM lecciones l
            WHERE l.modulo_id = ? AND l.orden < (
                SELECT orden FROM lecciones WHERE id = ?
            )
            ORDER BY l.orden DESC LIMIT 1
        ');
        $stmt->execute([$leccion['modulo_id'], $leccion_id]);
        $prev = $stmt->fetch();

        if ($prev) {
            $stmt = $db->prepare('SELECT completada FROM progreso WHERE usuario_id = ? AND leccion_id = ? AND completada = 1');
            $stmt->execute([$user['usuario_id'], $prev['id']]);
            if (!$stmt->fetch()) {
                error('Debes completar la lección anterior primero', 403);
            }
        }

        // Guardar progreso
        if ($existing) {
            $db->prepare('UPDATE progreso SET completada = 1, xp_ganado = ?, fecha_completado = NOW() WHERE usuario_id = ? AND leccion_id = ?')
               ->execute([$leccion['xp'], $user['usuario_id'], $leccion_id]);
        } else {
            $db->prepare('INSERT INTO progreso (usuario_id, leccion_id, completada, xp_ganado, fecha_completado) VALUES (?, ?, 1, ?, NOW())')
               ->execute([$user['usuario_id'], $leccion_id, $leccion['xp']]);
        }

        // Sumar XP al usuario
        $db->prepare('UPDATE usuarios SET xp = xp + ?, nivel = FLOOR((xp + ?) / 200) + 1 WHERE id = ?')
           ->execute([$leccion['xp'], $leccion['xp'], $user['usuario_id']]);

        // Verificar si completó el módulo completo → dar rol
        $stmt = $db->prepare('
            SELECT COUNT(*) as total FROM lecciones WHERE modulo_id = ? AND activo = 1
        ');
        $stmt->execute([$leccion['modulo_id']]);
        $totalLecciones = $stmt->fetch()['total'];

        $stmt = $db->prepare('
            SELECT COUNT(*) as completadas FROM progreso p
            JOIN lecciones l ON p.leccion_id = l.id
            WHERE p.usuario_id = ? AND l.modulo_id = ? AND p.completada = 1
        ');
        $stmt->execute([$user['usuario_id'], $leccion['modulo_id']]);
        $completadas = $stmt->fetch()['completadas'];

        $rolDesbloqueado = null;
        if ($completadas >= $totalLecciones) {
            // Obtener rol del módulo
            $stmt = $db->prepare('SELECT rol_desbloquea, rol_color FROM modulos WHERE id = ?');
            $stmt->execute([$leccion['modulo_id']]);
            $modulo = $stmt->fetch();

            if ($modulo && $modulo['rol_desbloquea']) {
                // Verificar si ya tiene el rol
                $stmt = $db->prepare('SELECT id FROM roles_usuario WHERE usuario_id = ? AND rol_nombre = ?');
                $stmt->execute([$user['usuario_id'], $modulo['rol_desbloquea']]);
                if (!$stmt->fetch()) {
                    $db->prepare('INSERT INTO roles_usuario (usuario_id, rol_nombre, rol_color) VALUES (?, ?, ?)')
                       ->execute([$user['usuario_id'], $modulo['rol_desbloquea'], $modulo['rol_color']]);
                    $rolDesbloqueado = $modulo['rol_desbloquea'];
                }
            }
        }

        // XP actualizado
        $stmt = $db->prepare('SELECT xp, nivel FROM usuarios WHERE id = ?');
        $stmt->execute([$user['usuario_id']]);
        $updated = $stmt->fetch();

        success([
            'xp_ganado' => $leccion['xp'],
            'xp_total' => $updated['xp'],
            'nivel' => $updated['nivel'],
            'rol_desbloqueado' => $rolDesbloqueado,
            'modulo_completado' => $completadas >= $totalLecciones,
        ]);
        break;

    // ── OBTENER MÓDULOS CON PROGRESO ────────────
    case 'modules':
        $stmt = $db->prepare('
            SELECT m.id, m.slug, m.titulo, m.icono, m.orden, m.descripcion,
                   m.rol_desbloquea, m.rol_color,
                   COUNT(l.id) as total_lecciones,
                   COALESCE(SUM(CASE WHEN p.completada = 1 THEN 1 ELSE 0 END), 0) as completadas
            FROM modulos m
            LEFT JOIN lecciones l ON m.id = l.modulo_id AND l.activo = 1
            LEFT JOIN progreso p ON l.id = p.leccion_id AND p.usuario_id = ?
            WHERE m.activo = 1
            GROUP BY m.id
            ORDER BY m.orden ASC
        ');
        $stmt->execute([$user['usuario_id']]);
        $modulos = $stmt->fetchAll();

        // Para cada módulo, obtener sus lecciones
        foreach ($modulos as &$mod) {
            $stmt = $db->prepare('
                SELECT l.id, l.slug, l.titulo, l.tipo, l.duracion, l.xp, l.video_url, l.contenido, l.orden,
                       COALESCE(p.completada, 0) as completada
                FROM lecciones l
                LEFT JOIN progreso p ON l.id = p.leccion_id AND p.usuario_id = ?
                WHERE l.modulo_id = ? AND l.activo = 1
                ORDER BY l.orden ASC
            ');
            $stmt->execute([$user['usuario_id'], $mod['id']]);
            $mod['lecciones'] = $stmt->fetchAll();
            $mod['progreso_pct'] = $mod['total_lecciones'] > 0
                ? round($mod['completadas'] / $mod['total_lecciones'] * 100)
                : 0;
        }

        success(['modulos' => $modulos]);
        break;

    default:
        error('Acción no válida', 404);
}

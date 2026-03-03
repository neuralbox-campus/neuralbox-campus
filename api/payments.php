<?php
// ============================================
// NEURALBOX - PAGOS / WEBHOOKS
// Archivo: /public_html/api/payments.php
// ============================================

require_once 'config.php';
setHeaders();

$action = $_GET['action'] ?? '';
$body = getBody();
$db = getDB();

// ── Sincronizar con Google Sheets ────────────
function syncSheets($data) {
    $url = 'https://script.google.com/macros/s/AKfycbyVB8nQ0_suHT6ful0o0-1EWfUtvyxHQhVyi8RgbJ7GWvdAQQqK30H93Qndfyg20x5h/exec';
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => true,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

switch ($action) {

    // ── WEBHOOK MERCADO PAGO ───────────────────
    case 'mp_webhook':
        $mp_token  = 'APP_USR-5700782813277926-030219-aedfa730baa6c0bb4d0513d19c3e2a08-3184905029';
        $mp_secret = '6f4af40f5e4814a48c149cf2b86499766bbf244ee5da8f93f5eeb03041fbaef2';

        // Validar firma de MP
        $xSignature  = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
        $xRequestId  = $_SERVER['HTTP_X_REQUEST_ID'] ?? '';
        $dataId      = $_GET['data.id'] ?? $body['data']['id'] ?? '';
        if ($xSignature) {
            $parts = explode(',', $xSignature);
            $ts = ''; $hash = '';
            foreach ($parts as $part) {
                $kv = explode('=', trim($part), 2);
                if ($kv[0] === 'ts') $ts = $kv[1];
                if ($kv[0] === 'v1') $hash = $kv[1];
            }
            $manifest = "id:{$dataId};request-id:{$xRequestId};ts:{$ts};";
            $expected = hash_hmac('sha256', $manifest, $mp_secret);
            if ($hash && $hash !== $expected) {
                http_response_code(401); exit();
            }
        }

        $type    = $_GET['type'] ?? $body['type'] ?? '';
        $data_id = $_GET['data_id'] ?? $body['data']['id'] ?? $dataId;

        // Aceptar payment y preapproval (suscripciones)
        if (!in_array($type, ['payment','subscription_preapproval']) || !$data_id) {
            http_response_code(200); echo 'OK'; exit();
        }

        // Consultar el pago a la API de MP
        $endpoint = $type === 'payment'
            ? "https://api.mercadopago.com/v1/payments/$data_id"
            : "https://api.mercadopago.com/preapproval/$data_id";

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ["Authorization: Bearer $mp_token"],
            CURLOPT_TIMEOUT => 10,
        ]);
        $response = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (!$response) { http_response_code(200); echo 'OK'; exit(); }

        // Para suscripciones el estado es 'authorized', para pagos es 'approved'
        $status = $response['status'] ?? '';
        if (!in_array($status, ['approved','authorized'])) {
            // Pago fallido — actualizar lead y Sheets
            $failEmail = strtolower($response['payer']['email'] ?? '');
            if ($failEmail) {
                $db->prepare('UPDATE leads_preventa SET estado="fallido", metodo_pago="mercadopago", updated_at=NOW() WHERE email=?')
                   ->execute([$failEmail]);
                $failLead = $db->prepare('SELECT * FROM leads_preventa WHERE email=?');
                $failLead->execute([$failEmail]);
                $failData = $failLead->fetch() ?: [];
                syncSheets([
                    'nombre'      => $failData['nombre'] ?? '',
                    'email'       => $failEmail,
                    'telefono'    => $failData['telefono'] ?? '',
                    'estado'      => 'fallido',
                    'metodo_pago' => 'mercadopago',
                    'mp_monto'    => '',
                    'fuente'      => 'mp_webhook',
                ]);
            }
            http_response_code(200); echo 'OK'; exit();
        }

        $email     = strtolower($response['payer']['email'] ?? '');
        $monto     = $response['transaction_amount'] ?? $response['auto_recurring']['transaction_amount'] ?? 0;
        $referencia = $response['id'] ?? '';

        if (!$email) { http_response_code(200); echo 'OK'; exit(); }

        // Evitar duplicados
        $stmt = $db->prepare('SELECT id FROM pagos WHERE referencia_externa = ?');
        $stmt->execute([$referencia]);
        if ($stmt->fetch()) { http_response_code(200); echo 'OK'; exit(); }

        // Determinar paquete por monto
        $paquete = 'mensual';
        if ($monto >= 100) $paquete = 'anual';
        elseif ($monto >= 40) $paquete = 'semestral';
        elseif ($monto <= 20) $paquete = 'preventa';

        // Buscar usuario en campus
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Registrar pago
        $db->prepare('INSERT INTO pagos (usuario_id, email, monto, moneda, metodo, referencia_externa, estado, paquete, datos_extra) VALUES (?,?,?,"COP","mercadopago",?,"completado",?,?)')
           ->execute([$user['id'] ?? null, $email, $monto, $referencia, $paquete, json_encode(['status'=>$status,'type'=>$type])]);

        // Actualizar lead a pagado
        $db->prepare('UPDATE leads_preventa SET estado="pagado", metodo_pago="mercadopago", mp_operacion=?, mp_monto=?, updated_at=NOW() WHERE email=?')
           ->execute([$referencia, $monto, $email]);

        // Si no existe el lead, crearlo como pagado
        if (!$db->prepare('SELECT id FROM leads_preventa WHERE email=?')->execute([$email])) {
            $db->prepare('INSERT IGNORE INTO leads_preventa (email, estado, metodo_pago, mp_operacion, mp_monto, fuente) VALUES (?,"pagado","mercadopago",?,?,"mp_webhook")')
               ->execute([$email, $referencia, $monto]);
        }

        // Dar acceso si ya tiene cuenta en el campus
        if ($user) {
            $db->prepare('UPDATE usuarios SET acceso_campus=1, paquete=? WHERE id=?')->execute([$paquete, $user['id']]);
        }

        // Sincronizar con Google Sheets
        $leadRow = $db->prepare('SELECT * FROM leads_preventa WHERE email=?');
        $leadRow->execute([$email]);
        $leadData = $leadRow->fetch() ?: [];
        syncSheets([
            'nombre'      => $leadData['nombre'] ?? '',
            'email'       => $email,
            'telefono'    => $leadData['telefono'] ?? '',
            'estado'      => 'pagado',
            'metodo_pago' => 'mercadopago',
            'mp_monto'    => $monto,
            'fuente'      => 'mp_webhook',
        ]);

        http_response_code(200);
        echo 'OK';
        break;

    // ── WEBHOOK PAYPAL ─────────────────────────
    case 'paypal_webhook':
        $pp_client_id  = 'AUjjeoh3RKw2bV0h5SXqCfIJPvEF3bTA0XFiRt8xmhH4UmPl-q2D860dJTke3mFryrjDKVFnsT7KJ2oq';
        $pp_secret     = 'EMdxVlUtBovCudIqmJK4E5FwUUgEUvFA6xlxCp8u-SQBWXcwBlwFmLStUp0Veuvt7zIbRLeAimD6FceV';
        $pp_webhook_id = '1RR35272UT670933C';

        $event_type = $body['event_type'] ?? '';
        $resource   = $body['resource'] ?? [];

        // Eventos que nos interesan: pago completado o suscripción activada
        $valid_events = [
            'PAYMENT.CAPTURE.COMPLETED',
            'PAYMENT.SALE.COMPLETED',
            'BILLING.SUBSCRIPTION.ACTIVATED',
            'CHECKOUT.ORDER.COMPLETED',
        ];

        if (!in_array($event_type, $valid_events)) {
            http_response_code(200); echo 'OK'; exit();
        }

        // Extraer email y monto según tipo de evento
        if ($event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            $email     = strtolower($resource['subscriber']['email_address'] ?? '');
            $monto     = floatval($resource['billing_info']['last_payment']['amount']['value'] ?? 18);
            $referencia = $resource['id'] ?? '';
        } else {
            $email     = strtolower($resource['payer']['email_address'] ?? $resource['payer']['payer_info']['email'] ?? '');
            $monto     = floatval($resource['amount']['value'] ?? $resource['amount']['total'] ?? 0);
            $referencia = $resource['id'] ?? '';
        }

        if (!$email || !$referencia) { http_response_code(200); echo 'OK'; exit(); }

        // Verificar duplicado
        $stmt = $db->prepare('SELECT id FROM pagos WHERE referencia_externa = ?');
        $stmt->execute([$referencia]);
        if ($stmt->fetch()) { http_response_code(200); echo 'OK'; exit(); }

        // Buscar usuario
        $stmt = $db->prepare('SELECT id FROM usuarios WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        // Convertir USD a COP aproximado
        $monto_cop = $monto * 4100;

        // Determinar paquete por monto USD
        $paquete = 'mensual';
        if ($monto >= 100) $paquete = 'anual';
        elseif ($monto >= 40) $paquete = 'semestral';
        elseif ($monto <= 20) $paquete = 'preventa';

        $db->prepare('INSERT INTO pagos (usuario_id, email, monto, moneda, metodo, referencia_externa, estado, paquete, datos_extra) VALUES (?,?,?,"USD","paypal",?,"completado",?,?)')
           ->execute([$user['id'] ?? null, $email, $monto, $referencia, $paquete, json_encode($body)]);

        // Actualizar lead a pagado
        $db->prepare('UPDATE leads_preventa SET estado="pagado", metodo_pago="paypal", mp_operacion=?, mp_monto=?, updated_at=NOW() WHERE email=?')
           ->execute([$referencia, $monto, $email]);

        // Si no existe el lead, crearlo
        $db->prepare('INSERT IGNORE INTO leads_preventa (email, estado, metodo_pago, mp_operacion, mp_monto, fuente) VALUES (?,"pagado","paypal",?,?,"paypal_webhook")')
           ->execute([$email, $referencia, $monto]);

        if ($user) {
            $db->prepare('UPDATE usuarios SET acceso_campus=1, paquete=? WHERE id=?')->execute([$paquete, $user['id']]);
        }

        // Sincronizar con Google Sheets
        $leadRow2 = $db->prepare('SELECT * FROM leads_preventa WHERE email=?');
        $leadRow2->execute([$email]);
        $leadData2 = $leadRow2->fetch() ?: [];
        syncSheets([
            'nombre'      => $leadData2['nombre'] ?? '',
            'email'       => $email,
            'telefono'    => $leadData2['telefono'] ?? '',
            'estado'      => 'pagado',
            'metodo_pago' => 'paypal',
            'mp_monto'    => $monto,
            'fuente'      => 'paypal_webhook',
        ]);

        http_response_code(200);
        echo 'OK';
        break;

    // ── VERIFICAR PAGO MANUAL ──────────────────
    case 'check_access':
        $user = authRequired();
        $db2 = getDB();

        $stmt = $db2->prepare('SELECT acceso_campus, paquete FROM usuarios WHERE id = ?');
        $stmt->execute([$user['usuario_id']]);
        $u = $stmt->fetch();

        // Si no tiene acceso, verificar si hay un pago pendiente por su email
        if (!$u['acceso_campus']) {
            $stmt = $db2->prepare('SELECT id FROM pagos WHERE email = ? AND estado = "completado"');
            $stmt->execute([$user['email']]);
            if ($stmt->fetch()) {
                $db2->prepare('UPDATE usuarios SET acceso_campus = 1, paquete = "box" WHERE id = ?')->execute([$user['usuario_id']]);
                $u['acceso_campus'] = 1;
                $u['paquete'] = 'box';
            }
        }

        success([
            'acceso_campus' => (bool)$u['acceso_campus'],
            'paquete' => $u['paquete'],
        ]);
        break;

    // ── ANUNCIOS (canal público) ───────────────
    case 'get_announces':
        $canal = $_GET['canal'] ?? 'anuncios';
        $usuario_id = null;

        // Intentar obtener usuario (opcional para reacciones)
        $headers = getallheaders();
        $token = str_replace('Bearer ', '', $headers['Authorization'] ?? '');
        if ($token) {
            $stmt = $db->prepare('SELECT usuario_id FROM sesiones WHERE id = ? AND expires_at > NOW()');
            $stmt->execute([$token]);
            $s = $stmt->fetch();
            $usuario_id = $s['usuario_id'] ?? null;
        }

        $stmt = $db->prepare('
            SELECT a.id, a.texto, a.imagen_url, a.video_url, a.created_at, u.username, u.emoji
            FROM anuncios a JOIN usuarios u ON a.publicado_por = u.id
            WHERE a.canal = ? AND a.activo = 1 ORDER BY a.created_at ASC LIMIT 50
        ');
        $stmt->execute([$canal]);
        $posts = $stmt->fetchAll();

        foreach ($posts as &$post) {
            // Contar reacciones por emoji
            $stmt2 = $db->prepare('SELECT emoji, COUNT(*) as count FROM reacciones WHERE anuncio_id = ? GROUP BY emoji');
            $stmt2->execute([$post['id']]);
            $post['reacciones'] = $stmt2->fetchAll();

            // Si hay usuario, ver cuáles ya reaccionó
            if ($usuario_id) {
                $stmt3 = $db->prepare('SELECT emoji FROM reacciones WHERE anuncio_id = ? AND usuario_id = ?');
                $stmt3->execute([$post['id'], $usuario_id]);
                $post['mis_reacciones'] = array_column($stmt3->fetchAll(), 'emoji');
            } else {
                $post['mis_reacciones'] = [];
            }
        }
        success(['posts' => $posts]);
        break;

    // ── REACCIONAR A ANUNCIO ───────────────────
    case 'react':
        $user = authRequired();
        $anuncio_id = intval($body['anuncio_id'] ?? 0);
        $emoji = trim($body['emoji'] ?? '');

        if (!$anuncio_id || !$emoji) error('Datos incompletos');

        // Toggle reacción
        $stmt = $db->prepare('SELECT id FROM reacciones WHERE anuncio_id = ? AND usuario_id = ? AND emoji = ?');
        $stmt->execute([$anuncio_id, $user['usuario_id'], $emoji]);

        if ($stmt->fetch()) {
            $db->prepare('DELETE FROM reacciones WHERE anuncio_id = ? AND usuario_id = ? AND emoji = ?')
               ->execute([$anuncio_id, $user['usuario_id'], $emoji]);
            success(['reaccionado' => false]);
        } else {
            $db->prepare('INSERT INTO reacciones (anuncio_id, usuario_id, emoji) VALUES (?,?,?)')
               ->execute([$anuncio_id, $user['usuario_id'], $emoji]);
            success(['reaccionado' => true]);
        }
        break;

    // ── CANALES (público — visible para todos los roles) ─────
    case 'get_canales':
        try {
            $stmt = $db->query('SELECT * FROM canales ORDER BY orden ASC, id ASC');
            success(['canales' => $stmt->fetchAll()]);
        } catch (Exception $e) {
            // tabla no existe aún
            success(['canales' => [
                ['id'=>1,'tipo'=>'categoria','nombre'=>'NAVEGACIÓN','icono'=>'📁','tab_destino'=>null,'categoria_id'=>null,'orden'=>1,'visible'=>1],
                ['id'=>2,'tipo'=>'canal','nombre'=>'anuncios','icono'=>'📢','tab_destino'=>'announce','categoria_id'=>1,'orden'=>1,'visible'=>1],
                ['id'=>3,'tipo'=>'canal','nombre'=>'freebox','icono'=>'🆓','tab_destino'=>'freebox','categoria_id'=>1,'orden'=>2,'visible'=>1],
                ['id'=>4,'tipo'=>'categoria','nombre'=>'CAMPUS','icono'=>'📁','tab_destino'=>null,'categoria_id'=>null,'orden'=>2,'visible'=>1],
                ['id'=>5,'tipo'=>'canal','nombre'=>'mi-campus','icono'=>'🎓','tab_destino'=>'mybox','categoria_id'=>4,'orden'=>1,'visible'=>1],
                ['id'=>6,'tipo'=>'canal','nombre'=>'leaderboard','icono'=>'🏆','tab_destino'=>'leaderboard','categoria_id'=>4,'orden'=>2,'visible'=>1],
            ]]);
        }
        break;

    default:
        error('Acción no válida', 404);
}
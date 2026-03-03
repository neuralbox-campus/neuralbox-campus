<?php
// ============================================
// NEURALBOX - CONFIGURACIÓN PRINCIPAL
// Archivo: /public_html/api/config.php
// ============================================

define('DB_HOST', '127.0.0.1');
define('DB_PORT', '3306');
define('DB_NAME', 'u795324874_neuralbox');
define('DB_USER', 'u795324874_neuralbox');
define('DB_PASS', 'NeuralBox2024!'); // ← Cambia esto

define('JWT_SECRET', 'neuralbox_secret_key_2024_cambiar'); // ← Cambia esto
define('CAMPUS_URL', 'https://preventa.neuralboxai.com');
define('API_URL', 'https://preventa.neuralboxai.com/api');

// Tiempo de sesión: 30 días
define('SESSION_DURATION', 60 * 60 * 24 * 30);

// Conexión a la base de datos
function getDB() {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['error' => 'Error de conexión a la base de datos']));
        }
    }
    return $pdo;
}

// Headers CORS y JSON
function setHeaders() {
    header('Content-Type: application/json; charset=utf-8');
    // Allow both campus and preventa domains
    $allowed = ['https://campus.neuralboxai.com', 'https://preventa.neuralboxai.com'];
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowed)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        header('Access-Control-Allow-Origin: https://campus.neuralboxai.com');
    }
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }
}

// Respuestas JSON
function success($data = [], $code = 200) {
    http_response_code($code);
    echo json_encode(['success' => true, 'data' => $data]);
    exit();
}

function error($message, $code = 400) {
    http_response_code($code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit();
}

// Obtener body JSON del request
function getBody() {
    $body = file_get_contents('php://input');
    return json_decode($body, true) ?? [];
}

// Verificar token de sesión
function authRequired() {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';
    $token = str_replace('Bearer ', '', $token);

    if (empty($token)) {
        error('No autenticado', 401);
    }

    $db = getDB();
    $stmt = $db->prepare('
        SELECT s.usuario_id, u.username, u.email, u.emoji, u.xp, u.rol, u.acceso_campus, u.paquete
        FROM sesiones s
        JOIN usuarios u ON s.usuario_id = u.id
        WHERE s.id = ? AND s.expires_at > NOW() AND u.activo = 1
    ');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        error('Sesión expirada o inválida', 401);
    }

    return $user;
}

// Verificar que sea admin
function adminRequired() {
    $user = authRequired();
    if ($user['rol'] !== 'admin') {
        error('Acceso denegado', 403);
    }
    return $user;
}

// Generar token aleatorio
function generateToken($length = 64) {
    return bin2hex(random_bytes($length));
}
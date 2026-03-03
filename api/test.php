<?php
header('Content-Type: application/json');

define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_NAME', 'u795324874_neuralbox');
define('DB_USER', 'u795324874_neuralbox');
define('DB_PASS', 'NeuralBox2024!'); // ← pon tu contraseña real aquí también

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS
    );
    
    $tablas = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $modulos = $pdo->query('SELECT COUNT(*) FROM modulos')->fetchColumn();
    $lecciones = $pdo->query('SELECT COUNT(*) FROM lecciones')->fetchColumn();
    
    echo json_encode([
        'status' => '✅ CONEXIÓN EXITOSA',
        'host' => DB_HOST,
        'database' => DB_NAME,
        'tablas' => $tablas,
        'modulos' => $modulos,
        'lecciones' => $lecciones,
        'php' => PHP_VERSION,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    echo json_encode([
        'status' => '❌ ERROR',
        'mensaje' => $e->getMessage(),
        'codigo' => $e->getCode(),
        'host_probado' => DB_HOST,
        'user_probado' => DB_USER,
        'db_probada' => DB_NAME,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
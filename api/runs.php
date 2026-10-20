<?php

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond($status, $body) {
  http_response_code($status);
  echo json_encode($body);
  exit;
}

$config = require dirname(__DIR__, 4) . '/cube-wars-config.php';

try {
  $pdo = new PDO(
    'mysql:host=' . $config['host'] . ';dbname=' . $config['name'] . ';charset=utf8mb4',
    $config['user'],
    $config['pass'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
  );
} catch (PDOException $e) {
  respond(500, ['error' => 'database unavailable', 'detail' => $e->getMessage()]);
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
  $rows = $pdo->query('SELECT wave, score FROM runs ORDER BY score DESC, wave DESC, id DESC LIMIT 5')
              ->fetchAll(PDO::FETCH_ASSOC);
  foreach ($rows as &$row) { $row['wave'] = (int)$row['wave']; $row['score'] = (int)$row['score']; }
  respond(200, $rows);
}

if ($method === 'POST') {
  $data = json_decode(file_get_contents('php://input'), true);
  if (!is_array($data)) respond(400, ['error' => 'invalid json']);

  $limits = ['score' => 99999999, 'wave' => 999, 'kills' => 999999, 'cards' => 999];
  $values = [];
  foreach ($limits as $key => $max) {
    if (!isset($data[$key]) || !is_int($data[$key]) || $data[$key] < 0 || $data[$key] > $max) {
      respond(400, ['error' => 'invalid ' . $key]);
    }
    $values[$key] = $data[$key];
  }

  $ipHash = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . $config['salt']);
  $recent = $pdo->prepare('SELECT COUNT(*) FROM runs WHERE ip_hash = ? AND created_at > (NOW() - INTERVAL 10 SECOND)');
  $recent->execute([$ipHash]);
  if ((int)$recent->fetchColumn() > 0) respond(429, ['error' => 'slow down']);

  $insert = $pdo->prepare('INSERT INTO runs (score, wave, kills, cards, ip_hash) VALUES (?, ?, ?, ?, ?)');
  $insert->execute([$values['score'], $values['wave'], $values['kills'], $values['cards'], $ipHash]);
  respond(201, ['ok' => true]);
}

respond(405, ['error' => 'method not allowed']);

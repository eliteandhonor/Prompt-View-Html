<?php
// Simple REST API for managing results/shared outputs for prompts
error_log("[results.php] --- Request Start ---");
error_log("[results.php] Method: " . $_SERVER['REQUEST_METHOD']);
error_log("[results.php] URI: " . $_SERVER['REQUEST_URI']);
error_log("[results.php] Query: " . (isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : ''));
error_log("[results.php] Raw Input: " . file_get_contents('php://input'));

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    error_log("[results.php] OPTIONS preflight, exiting.");
    exit;
}

$DATA_FILE = __DIR__ . '/../results.json';

// Utility: Read all results
function read_results($file) {
    error_log("[results.php] read_results called, file: $file");
    if (!file_exists($file)) {
        error_log("[results.php] Data file does not exist: $file");
        return [];
    }
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    error_log("[results.php] read_results loaded " . strlen($json) . " bytes");
    return is_array($data) ? $data : [];
}

// Utility: Write all results
function write_results($file, $data) {
    $bytes = file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    error_log("[results.php] write_results wrote $bytes bytes to $file");
    return $bytes;
}

// Utility: Send JSON response
function send_json($data, $code = 200) {
    error_log("[results.php] send_json called, code: $code, data: " . json_encode($data));
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    error_log("[results.php] --- Request End ---");
    exit;
}

// GET /api/results[?prompt_id=...] - list all results, optionally filtered by prompt_id
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    error_log("[results.php] Handling GET (list results)");
    $results = read_results($DATA_FILE);
    if (isset($_GET['prompt_id'])) {
        $pid = $_GET['prompt_id'];
        error_log("[results.php] GET filter by prompt_id: $pid");
        $results = array_values(array_filter($results, function($r) use ($pid) {
            return isset($r['prompt_id']) && $r['prompt_id'] === $pid;
        }));
    }
    send_json(['ok' => true, 'results' => $results]);
}

// POST /api/results - create a new result
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("[results.php] Handling POST (create result)");
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[results.php] POST input: " . json_encode($input));
    if (!is_array($input) || !isset($input['prompt_id']) || !isset($input['content'])) {
        error_log("[results.php] POST missing required fields");
        send_json(['ok' => false, 'error' => 'Missing required fields'], 400);
    }
    $results = read_results($DATA_FILE);
    $newResult = [
        'id' => uniqid('result_', true),
        'prompt_id' => $input['prompt_id'],
        'content' => trim($input['content']),
        'author' => isset($input['author']) ? trim($input['author']) : null,
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ];
    $results[] = $newResult;
    write_results($DATA_FILE, $results);
    error_log("[results.php] Created new result: " . json_encode($newResult));
    send_json(['ok' => true, 'result' => $newResult], 201);
}

// PUT /api/results?id=... - update a result
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    error_log("[results.php] Handling PUT (update result)");
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[results.php] PUT id: " . $id);
    if (!$id) {
        error_log("[results.php] PUT missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[results.php] PUT input: " . json_encode($input));
    if (!is_array($input)) {
        error_log("[results.php] PUT invalid input");
        send_json(['ok' => false, 'error' => 'Invalid input'], 400);
    }
    $results = read_results($DATA_FILE);
    $found = false;
    foreach ($results as &$result) {
        if ($result['id'] === $id) {
            if (isset($input['content'])) $result['content'] = trim($input['content']);
            if (isset($input['author'])) $result['author'] = trim($input['author']);
            $result['updated_at'] = date('c');
            $found = true;
            error_log("[results.php] Updated result: " . json_encode($result));
            break;
        }
    }
    if (!$found) {
        error_log("[results.php] PUT result not found");
        send_json(['ok' => false, 'error' => 'Result not found'], 404);
    }
    write_results($DATA_FILE, $results);
    send_json(['ok' => true]);
}

// DELETE /api/results?id=... - delete a result
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    error_log("[results.php] Handling DELETE (delete result)");
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[results.php] DELETE id: " . $id);
    if (!$id) {
        error_log("[results.php] DELETE missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $results = read_results($DATA_FILE);
    $newResults = array_filter($results, function($r) use ($id) { return $r['id'] !== $id; });
    if (count($newResults) === count($results)) {
        error_log("[results.php] DELETE result not found");
        send_json(['ok' => false, 'error' => 'Result not found'], 404);
    }
    write_results($DATA_FILE, array_values($newResults));
    error_log("[results.php] Deleted result id: " . $id);
    send_json(['ok' => true]);
}

// Fallback: method not allowed
error_log("[results.php] Method not allowed: " . $_SERVER['REQUEST_METHOD']);
send_json(['ok' => false, 'error' => 'Method not allowed'], 405);
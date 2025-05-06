<?php
// Simple REST API for managing tags
error_log("[tags.php] --- Request Start ---");
error_log("[tags.php] Method: " . $_SERVER['REQUEST_METHOD']);
error_log("[tags.php] URI: " . $_SERVER['REQUEST_URI']);
error_log("[tags.php] Query: " . (isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : ''));
error_log("[tags.php] Raw Input: " . file_get_contents('php://input'));

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    error_log("[tags.php] OPTIONS preflight, exiting.");
    exit;
}

$DATA_FILE = __DIR__ . '/../tags.json';

// Utility: Read all tags
function read_tags($file) {
    error_log("[tags.php] read_tags called, file: $file");
    if (!file_exists($file)) {
        error_log("[tags.php] Data file does not exist: $file");
        return [];
    }
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    error_log("[tags.php] read_tags loaded " . strlen($json) . " bytes");
    return is_array($data) ? $data : [];
}

// Utility: Write all tags
function write_tags($file, $data) {
    $bytes = file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    error_log("[tags.php] write_tags wrote $bytes bytes to $file");
    return $bytes;
}

// Utility: Send JSON response
function send_json($data, $code = 200) {
    error_log("[tags.php] send_json called, code: $code, data: " . json_encode($data));
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    error_log("[tags.php] --- Request End ---");
    exit;
}

// GET /api/tags - list all tags
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    error_log("[tags.php] Handling GET (list all tags)");
    $tags = read_tags($DATA_FILE);
    send_json(['ok' => true, 'tags' => $tags]);
}

// POST /api/tags - create a new tag
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("[tags.php] Handling POST (create tag)");
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[tags.php] POST input: " . json_encode($input));
    if (!is_array($input) || !isset($input['name'])) {
        error_log("[tags.php] POST missing required fields");
        send_json(['ok' => false, 'error' => 'Missing required fields'], 400);
    }
    $tagName = trim($input['name']);
    if (strpos($tagName, ',') !== false) {
        error_log("[tags.php] POST rejected tag with comma: $tagName");
        send_json(['ok' => false, 'error' => 'Tag names cannot contain commas.'], 400);
    }
    $tags = read_tags($DATA_FILE);
    $newTag = [
        'id' => uniqid('tag_', true),
        'name' => $tagName,
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ];
    $tags[] = $newTag;
    write_tags($DATA_FILE, $tags);
    error_log("[tags.php] Created new tag: " . json_encode($newTag));
    send_json(['ok' => true, 'tag' => $newTag], 201);
}

// PUT /api/tags?id=... - update a tag
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    error_log("[tags.php] Handling PUT (update tag)");
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[tags.php] PUT id: " . $id);
    if (!$id) {
        error_log("[tags.php] PUT missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[tags.php] PUT input: " . json_encode($input));
    if (!is_array($input)) {
        error_log("[tags.php] PUT invalid input");
        send_json(['ok' => false, 'error' => 'Invalid input'], 400);
    }
    $tags = read_tags($DATA_FILE);
    $found = false;
    foreach ($tags as &$tag) {
        if ($tag['id'] === $id) {
            if (isset($input['name'])) $tag['name'] = trim($input['name']);
            $tag['updated_at'] = date('c');
            $found = true;
            error_log("[tags.php] Updated tag: " . json_encode($tag));
            break;
        }
    }
    if (!$found) {
        error_log("[tags.php] PUT tag not found");
        send_json(['ok' => false, 'error' => 'Tag not found'], 404);
    }
    write_tags($DATA_FILE, $tags);
    send_json(['ok' => true]);
}

// DELETE /api/tags?id=... - delete a tag
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    error_log("[tags.php] Handling DELETE (delete tag)");
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[tags.php] DELETE id: " . $id);
    if (!$id) {
        error_log("[tags.php] DELETE missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $tags = read_tags($DATA_FILE);
    $newTags = array_filter($tags, function($t) use ($id) { return $t['id'] !== $id; });
    if (count($newTags) === count($tags)) {
        error_log("[tags.php] DELETE tag not found");
        send_json(['ok' => false, 'error' => 'Tag not found'], 404);
    }
    write_tags($DATA_FILE, array_values($newTags));
    error_log("[tags.php] Deleted tag id: " . $id);
    send_json(['ok' => true]);
}

// Fallback: method not allowed
error_log("[tags.php] Method not allowed: " . $_SERVER['REQUEST_METHOD']);
send_json(['ok' => false, 'error' => 'Method not allowed'], 405);
<?php
// Simple REST API for managing prompts
error_log("[prompts.php] --- Request Start ---");
error_log("[prompts.php] Method: " . $_SERVER['REQUEST_METHOD']);
error_log("[prompts.php] URI: " . $_SERVER['REQUEST_URI']);
error_log("[prompts.php] Query: " . (isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : ''));
error_log("[prompts.php] Raw Input: " . file_get_contents('php://input'));

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    error_log("[prompts.php] OPTIONS preflight, exiting.");
    exit;
}

$DATA_FILE = __DIR__ . '/../prompts.json';

// Utility: Read all prompts
function read_prompts($file) {
    error_log("[prompts.php] read_prompts called, file: $file");
    if (!file_exists($file)) {
        error_log("[prompts.php] Data file does not exist: $file");
        return [];
    }
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    error_log("[prompts.php] read_prompts loaded " . strlen($json) . " bytes");
    return is_array($data) ? $data : [];
}

// Utility: Write all prompts
function write_prompts($file, $data) {
    $bytes = file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    error_log("[prompts.php] write_prompts wrote $bytes bytes to $file");
    return $bytes;
}

// Utility: Send JSON response
function send_json($data, $code = 200) {
    error_log("[prompts.php] send_json called, code: $code, data: " . json_encode($data));
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    error_log("[prompts.php] --- Request End ---");
    exit;
}

// GET /api/prompts - list all prompts
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    error_log("[prompts.php] Handling GET (list all prompts)");
    $prompts = read_prompts($DATA_FILE);
    send_json(['ok' => true, 'prompts' => $prompts]);
}

// POST /api/prompts - create a new prompt
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("[prompts.php] Handling POST (create, delete, or update prompt)");
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[prompts.php] POST input: " . json_encode($input));

    // Support POST {action: "delete", id: ...} for JS clients
    if (is_array($input) && isset($input['action']) && $input['action'] === 'delete') {
        $id = $input['id'] ?? null;
        error_log("[prompts.php] POST delete id: " . $id);
        if (!$id) {
            error_log("[prompts.php] POST delete missing id");
            send_json(['ok' => false, 'error' => 'Missing id'], 400);
        }
        $prompts = read_prompts($DATA_FILE);
        $newPrompts = array_filter($prompts, function($p) use ($id) { return $p['id'] !== $id; });
        if (count($newPrompts) === count($prompts)) {
            error_log("[prompts.php] POST delete prompt not found");
            send_json(['ok' => false, 'error' => 'Prompt not found'], 404);
        }
        write_prompts($DATA_FILE, array_values($newPrompts));
        error_log("[prompts.php] POST deleted prompt id: " . $id);
        send_json(['ok' => true]);
    }

    // Support POST {action: "update", id: ..., title: ..., content: ...}
    if (is_array($input) && isset($input['action']) && $input['action'] === 'update') {
        $id = $input['id'] ?? null;
        $title = $input['title'] ?? null;
        $content = $input['content'] ?? null;
        error_log("[prompts.php] POST update id: " . $id);
        if (!$id || !$title || !$content) {
            error_log("[prompts.php] POST update missing required fields");
            send_json(['ok' => false, 'error' => 'Missing required fields'], 400);
        }
        $prompts = read_prompts($DATA_FILE);
        $found = false;
        foreach ($prompts as &$p) {
            if ($p['id'] === $id) {
                $p['title'] = trim($title);
                $p['content'] = trim($content);
                $p['updated_at'] = date('c');
                $found = true;
                error_log("[prompts.php] POST updated prompt id: " . $p['id']);
                break;
            }
        }
        if (!$found) {
            error_log("[prompts.php] POST update prompt not found");
            send_json(['ok' => false, 'error' => 'Prompt not found'], 404);
        }
        write_prompts($DATA_FILE, $prompts);
        send_json(['ok' => true]);
    }

    // Default: create prompt
    if (
        !is_array($input) ||
        !isset($input['title']) ||
        !isset($input['content']) ||
        !isset($input['category']) ||
        !is_string($input['category']) ||
        trim($input['category']) === "" ||
        !isset($input['tags']) ||
        !is_array($input['tags'])
    ) {
        error_log("[prompts.php] POST missing or invalid required fields");
        send_json(['ok' => false, 'error' => 'Missing or invalid required fields (title, content, category, tags)'], 400);
    }
    $prompts = read_prompts($DATA_FILE);
    $newPrompt = [
        'id' => uniqid('prompt_', true),
        'title' => trim($input['title']),
        'content' => trim($input['content']),
        'category' => isset($input['category']) ? $input['category'] : '',
        'tags' => isset($input['tags']) && is_array($input['tags']) ? $input['tags'] : [],
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ];
    $prompts[] = $newPrompt;
    write_prompts($DATA_FILE, $prompts);
    error_log("[prompts.php] Created new prompt: " . json_encode($newPrompt));
    send_json(['ok' => true, 'prompt' => $newPrompt], 201);
}

// PUT /api/prompts?id=... - update a prompt
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    error_log("[prompts.php] Handling PUT (update prompt)");
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[prompts.php] PUT id: " . $id);
    if (!$id) {
        error_log("[prompts.php] PUT missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[prompts.php] PUT input: " . json_encode($input));
    if (!is_array($input)) {
        error_log("[prompts.php] PUT invalid input");
        send_json(['ok' => false, 'error' => 'Invalid input'], 400);
    }
    $prompts = read_prompts($DATA_FILE);
    $found = false;
    foreach ($prompts as &$prompt) {
        if ($prompt['id'] === $id) {
            if (isset($input['title'])) $prompt['title'] = trim($input['title']);
            if (isset($input['content'])) $prompt['content'] = trim($input['content']);
            $prompt['updated_at'] = date('c');
            $found = true;
            error_log("[prompts.php] Updated prompt: " . json_encode($prompt));
            break;
        }
    }
    
    // Handle PUT (update prompt)
    if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        error_log("[prompts.php] Handling PUT (update prompt)");
        $raw = file_get_contents('php://input');
        error_log("[prompts.php] PUT raw input: " . $raw);
        $input = json_decode($raw, true);
        error_log("[prompts.php] PUT input (json_decode): " . var_export($input, true));
        if (!is_array($input) || !isset($input['id']) || !isset($input['title']) || !isset($input['content'])) {
            error_log("[prompts.php] PUT missing required fields");
            send_json(['ok' => false, 'error' => 'Missing required fields'], 400);
        }
        $prompts = read_prompts($DATA_FILE);
        $found = false;
        foreach ($prompts as &$p) {
            if ($p['id'] === $input['id']) {
                $p['title'] = trim($input['title']);
                $p['content'] = trim($input['content']);
                $p['updated_at'] = date('c');
                $found = true;
                error_log("[prompts.php] Updated prompt id: " . $p['id']);
                break;
            }
        }
        if (!$found) {
            error_log("[prompts.php] PUT prompt not found");
            send_json(['ok' => false, 'error' => 'Prompt not found'], 404);
        }
        write_prompts($DATA_FILE, $prompts);
        send_json(['ok' => true]);
    }
    if (!$found) {
        error_log("[prompts.php] PUT prompt not found");
        send_json(['ok' => false, 'error' => 'Prompt not found'], 404);
    }
    write_prompts($DATA_FILE, $prompts);
    send_json(['ok' => true]);
}

// DELETE /api/prompts?id=... - delete a prompt
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    error_log("[prompts.php] Handling DELETE (delete prompt)");
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[prompts.php] DELETE id: " . $id);
    if (!$id) {
        error_log("[prompts.php] DELETE missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $prompts = read_prompts($DATA_FILE);
    $newPrompts = array_filter($prompts, function($p) use ($id) { return $p['id'] !== $id; });
    if (count($newPrompts) === count($prompts)) {
        error_log("[prompts.php] DELETE prompt not found");
        send_json(['ok' => false, 'error' => 'Prompt not found'], 404);
    }
    write_prompts($DATA_FILE, array_values($newPrompts));
    error_log("[prompts.php] Deleted prompt id: " . $id);
    send_json(['ok' => true]);
}

// Fallback: method not allowed
error_log("[prompts.php] Method not allowed: " . $_SERVER['REQUEST_METHOD']);
send_json(['ok' => false, 'error' => 'Method not allowed'], 405);
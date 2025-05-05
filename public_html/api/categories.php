<?php
// Simple REST API for managing categories
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$DATA_FILE = __DIR__ . '/../categories.json';

// Utility: Read all categories
function read_categories($file) {
    if (!file_exists($file)) return [];
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    return is_array($data) ? $data : [];
}

// Utility: Write all categories
function write_categories($file, $data) {
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Utility: Send JSON response
function send_json($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
}

// GET /api/categories - list all categories
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    error_log("[categories.php] GET request received");
    $categories = read_categories($DATA_FILE);
    error_log("[categories.php] GET returning " . count($categories) . " categories");
    send_json(['ok' => true, 'categories' => $categories]);
}

// POST /api/categories - create a new category
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[categories.php] POST request received: " . json_encode($input));
    if (!is_array($input) || !isset($input['name'])) {
        error_log("[categories.php] POST error: Missing required fields");
        send_json(['ok' => false, 'error' => 'Missing required fields'], 400);
    }
    $categories = read_categories($DATA_FILE);
    $newCategory = [
        'id' => uniqid('cat_', true),
        'name' => trim($input['name']),
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ];
    $categories[] = $newCategory;
    write_categories($DATA_FILE, $categories);
    error_log("[categories.php] POST created category: " . json_encode($newCategory));
    send_json(['ok' => true, 'category' => $newCategory], 201);
}

// PUT /api/categories?id=... - update a category
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[categories.php] PUT request received: id=" . json_encode($id));
    if (!$id) {
        error_log("[categories.php] PUT error: Missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[categories.php] PUT input: " . json_encode($input));
    if (!is_array($input)) {
        error_log("[categories.php] PUT error: Invalid input");
        send_json(['ok' => false, 'error' => 'Invalid input'], 400);
    }
    $categories = read_categories($DATA_FILE);
    $found = false;
    foreach ($categories as &$category) {
        if ($category['id'] === $id) {
            if (isset($input['name'])) $category['name'] = trim($input['name']);
            $category['updated_at'] = date('c');
            $found = true;
            error_log("[categories.php] PUT updated category: " . json_encode($category));
            break;
        }
    }
    if (!$found) {
        error_log("[categories.php] PUT error: Category not found");
        send_json(['ok' => false, 'error' => 'Category not found'], 404);
    }
    write_categories($DATA_FILE, $categories);
    send_json(['ok' => true]);
}

// DELETE /api/categories?id=... - delete a category
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[categories.php] DELETE request received: id=" . json_encode($id));
    if (!$id) {
        error_log("[categories.php] DELETE error: Missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $categories = read_categories($DATA_FILE);
    $newCategories = array_filter($categories, function($c) use ($id) { return $c['id'] !== $id; });
    if (count($newCategories) === count($categories)) {
        error_log("[categories.php] DELETE error: Category not found");
        send_json(['ok' => false, 'error' => 'Category not found'], 404);
    }
    write_categories($DATA_FILE, array_values($newCategories));
    error_log("[categories.php] DELETE deleted category id: " . json_encode($id));
    send_json(['ok' => true]);
}

// Fallback: method not allowed
send_json(['ok' => false, 'error' => 'Method not allowed'], 405);
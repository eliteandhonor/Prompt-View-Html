<?php
/**
 * API Endpoints for /api/comments.php
 *
 * GET    /api/comments.php?prompt_id=...   - List all comments for a prompt
 * POST   /api/comments.php                  - Add a comment (JSON: {prompt_id, content, [author]})
 * PUT    /api/comments.php?id=...           - Update a comment (JSON: {content, [author]})
 * DELETE /api/comments.php?id=...           - Delete a comment by id
 *
 * All endpoints return JSON: { ok: boolean, ... }
 */
// Simple REST API for managing comments on prompts
error_log("[comments.php] --- Request Start ---");
error_log("[comments.php] Method: " . $_SERVER['REQUEST_METHOD']);
error_log("[comments.php] URI: " . $_SERVER['REQUEST_URI']);
error_log("[comments.php] Query: " . (isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : ''));
error_log("[comments.php] Raw Input: " . file_get_contents('php://input'));

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    error_log("[comments.php] OPTIONS preflight, exiting.");
    exit;
}

$DATA_FILE = __DIR__ . '/../comments.json';

// Utility: Read all comments
function read_comments($file) {
    error_log("[comments.php] read_comments called, file: $file");
    if (!file_exists($file)) {
        error_log("[comments.php] Data file does not exist: $file");
        return [];
    }
    $json = file_get_contents($file);
    $data = json_decode($json, true);
    error_log("[comments.php] read_comments loaded " . strlen($json) . " bytes");
    return is_array($data) ? $data : [];
}

// Utility: Write all comments
function write_comments($file, $data) {
   $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
   $bytes = @file_put_contents($file, $json);
   if ($bytes === false) {
       $error = error_get_last();
       error_log("[comments.php] ERROR: Failed to write $file: " . ($error ? $error['message'] : 'unknown error'));
   } else {
       error_log("[comments.php] write_comments wrote $bytes bytes to $file");
   }
   return $bytes;
}

// Utility: Send JSON response
function send_json($data, $code = 200) {
    error_log("[comments.php] send_json called, code: $code, data: " . json_encode($data));
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    error_log("[comments.php] --- Request End ---");
    exit;
}

// GET /api/comments[?prompt_id=...] - list all comments, optionally filtered by prompt_id
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    error_log("[comments.php] Handling GET (list comments)");
    $comments = read_comments($DATA_FILE);
    if (isset($_GET['prompt_id'])) {
        $pid = $_GET['prompt_id'];
        error_log("[comments.php] GET filter by prompt_id: $pid");
        $comments = array_values(array_filter($comments, function($c) use ($pid) {
            return isset($c['prompt_id']) && $c['prompt_id'] === $pid;
        }));
    }
    send_json(['ok' => true, 'comments' => $comments]);
}

// POST /api/comments - create a new comment
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    error_log("[comments.php] Handling POST (create comment)");
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[comments.php] POST input: " . json_encode($input));
    if (!is_array($input) || !isset($input['prompt_id']) || !isset($input['content'])) {
        error_log("[comments.php] POST missing required fields");
        send_json(['ok' => false, 'error' => 'Missing required fields'], 400);
    }
    $comments = read_comments($DATA_FILE);
    $newComment = [
        'id' => uniqid('comment_', true),
        'prompt_id' => $input['prompt_id'],
        'content' => trim($input['content']),
        'author' => isset($input['author']) ? trim($input['author']) : null,
        'created_at' => date('c'),
        'updated_at' => date('c'),
    ];
    $comments[] = $newComment;
    write_comments($DATA_FILE, $comments);
    error_log("[comments.php] Created new comment: " . json_encode($newComment));
    send_json(['ok' => true, 'comment' => $newComment], 201);
}

// PUT /api/comments?id=... - update a comment
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    error_log("[comments.php] Handling PUT (update comment)");
    parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
    $id = $params['id'] ?? null;
    error_log("[comments.php] PUT id: " . $id);
    if (!$id) {
        error_log("[comments.php] PUT missing id");
        send_json(['ok' => false, 'error' => 'Missing id'], 400);
    }
    $input = json_decode(file_get_contents('php://input'), true);
    error_log("[comments.php] PUT input: " . json_encode($input));
    if (!is_array($input)) {
        error_log("[comments.php] PUT invalid input");
        send_json(['ok' => false, 'error' => 'Invalid input'], 400);
    }
    $comments = read_comments($DATA_FILE);
    $found = false;
    foreach ($comments as &$comment) {
        if ($comment['id'] === $id) {
            if (isset($input['content'])) $comment['content'] = trim($input['content']);
            if (isset($input['author'])) $comment['author'] = trim($input['author']);
            $comment['updated_at'] = date('c');
            $found = true;
            error_log("[comments.php] Updated comment: " . json_encode($comment));
            break;
        }
    }
    if (!$found) {
        error_log("[comments.php] PUT comment not found");
        send_json(['ok' => false, 'error' => 'Comment not found'], 404);
    }
    write_comments($DATA_FILE, $comments);
    send_json(['ok' => true]);
}

// DELETE /api/comments?id=... - delete a comment
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
   error_log("[comments.php] Handling DELETE (delete comment)");
   parse_str($_SERVER['QUERY_STRING'] ?? '', $params);
   $id = $params['id'] ?? null;
   error_log("[comments.php] DELETE id: " . $id);
   if (!$id) {
       error_log("[comments.php] DELETE missing id");
       send_json(['ok' => false, 'error' => 'Missing id'], 400);
   }
   $comments = read_comments($DATA_FILE);
   error_log("[comments.php] Existing comment IDs: " . implode(', ', array_map(function($c){return $c['id'];}, $comments)));
   $newComments = array_filter($comments, function($c) use ($id) { return $c['id'] !== $id; });
   error_log("[comments.php] Remaining comment IDs after delete: " . implode(', ', array_map(function($c){return $c['id'];}, $newComments)));
   if (count($newComments) === count($comments)) {
       error_log("[comments.php] DELETE comment not found");
       send_json(['ok' => false, 'error' => 'Comment not found'], 404);
   }
   $result = write_comments($DATA_FILE, array_values($newComments));
   if ($result === false) {
       error_log("[comments.php] ERROR: Failed to write updated comments after delete");
       send_json(['ok' => false, 'error' => 'Failed to write comments file'], 500);
   }
   error_log("[comments.php] Deleted comment id: " . $id);
   send_json(['ok' => true]);
}

// Fallback: method not allowed
error_log("[comments.php] Method not allowed: " . $_SERVER['REQUEST_METHOD']);
send_json(['ok' => false, 'error' => 'Method not allowed'], 405);
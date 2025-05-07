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

// Utility: Validate a prompt against the canonical schema
function validate_prompt_schema($prompt, $schemaFields) {
    $errors = [];
    foreach ($schemaFields as $field => $type) {
        if (!array_key_exists($field, $prompt)) {
            $errors[] = "Missing field: $field";
            continue;
        }
        $value = $prompt[$field];
        switch ($type) {
            case 'string':
                if (!is_string($value) || trim($value) === '') {
                    $errors[] = "Field '$field' must be a non-empty string";
                }
                break;
            case 'array':
                if (!is_array($value)) {
                    $errors[] = "Field '$field' must be an array";
                }
                break;
            default:
                $errors[] = "Unknown type for field '$field'";
        }
    }
    return $errors;
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
        // Cascade delete: remove related comments and results
        $commentsFile = __DIR__ . '/../comments.json';
        $resultsFile = __DIR__ . '/../results.json';
        // Remove comments
        if (file_exists($commentsFile)) {
            $comments = json_decode(file_get_contents($commentsFile), true);
            $comments = is_array($comments) ? $comments : [];
            $filteredComments = array_values(array_filter($comments, function($c) use ($id) {
                return !isset($c['prompt_id']) || $c['prompt_id'] !== $id;
            }));
            file_put_contents($commentsFile, json_encode($filteredComments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        // Remove results
        if (file_exists($resultsFile)) {
            $results = json_decode(file_get_contents($resultsFile), true);
            $results = is_array($results) ? $results : [];
            $filteredResults = array_values(array_filter($results, function($r) use ($id) {
                return !isset($r['prompt_id']) || $r['prompt_id'] !== $id;
            }));
            file_put_contents($resultsFile, json_encode($filteredResults, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        }
        error_log("[prompts.php] POST deleted prompt id: " . $id . " and cascaded deletes for comments/results");
        send_json(['ok' => true]);
    }

    // Support POST {action: "update", id: ..., title: ..., content: ..., category: ..., tags: [...]}
    if (is_array($input) && isset($input['action']) && $input['action'] === 'update') {
        $id = $input['id'] ?? null;
        $title = $input['title'] ?? null;
        $content = $input['content'] ?? null;
        $category = $input['category'] ?? null;
        $tags = $input['tags'] ?? null;
        error_log("[prompts.php] POST update id: " . $id . ", category: " . json_encode($category) . ", tags: " . json_encode($tags));
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
                // Update category if provided and valid
                if ($category !== null && is_string($category) && trim($category) !== '') {
                    $p['category'] = trim($category);
                    error_log("[prompts.php] POST update set category: " . $p['category']);
                }
                // Update tags if provided and valid
                if ($tags !== null && is_array($tags)) {
                    $p['tags'] = $tags;
                    error_log("[prompts.php] POST update set tags: " . json_encode($p['tags']));
                }
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

    // Support POST {action: "import", prompts: [...]}
    if (is_array($input) && isset($input['action']) && $input['action'] === 'import') {
        // DEBUG: Log content length and snippet for each prompt received
        if (isset($input['prompts']) && is_array($input['prompts'])) {
            foreach ($input['prompts'] as $i => $p) {
                $content = isset($p['content']) ? $p['content'] : '';
                error_log("[prompts.php][DEBUG] Import prompt #$i content length: " . strlen($content) . ", first 50: \"" . substr($content,0,50) . "\", last 50: \"" . substr($content,-50) . "\"");
            }
        }
        $imported = [];
        $skipped = [];
        $errors = [];
        $promptsArr = isset($input['prompts']) && is_array($input['prompts']) ? $input['prompts'] : [];
        $existingPrompts = read_prompts($DATA_FILE);

        // Load canonical schema fields/types from prompts-template.json
        $schemaFile = __DIR__ . '/../data/prompts-template.json';
        $schemaJson = file_exists($schemaFile) ? file_get_contents($schemaFile) : '';
        $schemaArr = json_decode($schemaJson, true);
        $schemaFields = [];
        if (is_array($schemaArr) && count($schemaArr) > 0 && is_array($schemaArr[0])) {
            foreach ($schemaArr[0] as $k => $v) {
                $schemaFields[$k] = is_array($v) ? 'array' : 'string';
            }
        }

        // Build a set of existing IDs for fast lookup
        $existingIds = [];
        foreach ($existingPrompts as $ep) {
            if (isset($ep['id'])) {
                $existingIds[$ep['id']] = true;
            }
        }

        foreach ($promptsArr as $idx => $p) {
            error_log("[prompts.php] Validating prompt index $idx, description raw value: '" . (isset($p['description']) ? $p['description'] : '[not set]') . "'");
            $err = [];
            if (!is_array($p)) {
                $err[] = "Not an object";
            } else {
                // Validate required fields (title, content, category, tags)
                if (!isset($p['title']) || !is_string($p['title']) || trim($p['title']) === '') $err[] = "Missing or invalid title";
                if (!isset($p['content']) || !is_string($p['content']) || trim($p['content']) === '') $err[] = "Missing or invalid content";
                if (!isset($p['category']) || !is_string($p['category']) || trim($p['category']) === '') $err[] = "Missing or invalid category";
                if (!isset($p['tags']) || !is_array($p['tags'])) $err[] = "Missing or invalid tags";
                // Optionally, validate against canonical schema if available
                if (!empty($schemaFields)) {
                    $schemaErrs = [];
                    foreach ($schemaFields as $field => $type) {
                        if (!array_key_exists($field, $p)) {
                            $schemaErrs[] = "Missing field: $field";
                        } else {
                            $value = $p[$field];
                            if ($type === 'string' && (!is_string($value) || trim($value) === '')) {
                                $schemaErrs[] = "Field '$field' must be a non-empty string";
                            }
                            if ($type === 'array' && !is_array($value)) {
                                $schemaErrs[] = "Field '$field' must be an array";
                            }
                        }
                    }
                    if (count($schemaErrs) > 0) {
                        $err = array_merge($err, $schemaErrs);
                    }
                }
                // Check for duplicate id if provided
                if (isset($p['id']) && isset($existingIds[$p['id']])) {
                    $err[] = "Duplicate id: " . $p['id'];
                }
            }
            if (count($err) > 0) {
                $skipped[] = $p;
                $errors[] = [
                    'index' => $idx,
                    'title' => isset($p['title']) ? $p['title'] : null,
                    'errors' => $err
                ];
                continue;
            }
            // Build new prompt, preserving all fields from canonical schema and any extra fields
            $newPrompt = [];
            if (!empty($schemaFields)) {
                foreach ($schemaFields as $field => $type) {
                    if (isset($p[$field])) {
                        $newPrompt[$field] = $p[$field];
                    }
                }
            }
            // Copy any extra fields not in schema
            foreach ($p as $k => $v) {
                if (!isset($newPrompt[$k])) {
                    $newPrompt[$k] = $v;
                }
            }
            // Handle id: preserve if not duplicate, else generate new
            if (!isset($newPrompt['id']) || isset($existingIds[$newPrompt['id']])) {
                $newPrompt['id'] = uniqid('prompt_', true);
            }
            // Always set created_at/updated_at if not present
            if (!isset($newPrompt['created_at'])) $newPrompt['created_at'] = date('c');
            if (!isset($newPrompt['updated_at'])) $newPrompt['updated_at'] = date('c');
            $imported[] = $newPrompt;
            $existingPrompts[] = $newPrompt;
            if (isset($newPrompt['id'])) {
                $existingIds[$newPrompt['id']] = true;
            }
        }
        write_prompts($DATA_FILE, $existingPrompts);
        error_log("[prompts.php] Batch import: imported=" . count($imported) . ", skipped=" . count($skipped));
        send_json([
            'ok' => true,
            'imported_count' => count($imported),
            'skipped_count' => count($skipped),
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors
        ]);
    }

    // Support POST {action: "batch_import", prompts: [...]}
    if (is_array($input) && isset($input['action']) && $input['action'] === 'batch_import') {
        error_log("[prompts.php] Handling batch_import action");
        $imported = [];
        $skipped = [];
        $errors = [];
        $promptsArr = isset($input['prompts']) && is_array($input['prompts']) ? $input['prompts'] : [];
        $existingPrompts = read_prompts($DATA_FILE);

        // Build a set of existing IDs for fast lookup
        $existingIds = [];
        foreach ($existingPrompts as $ep) {
            if (isset($ep['id'])) {
                $existingIds[$ep['id']] = true;
            }
        }

        // Load canonical schema fields/types from prompts-template.json
        $schemaFile = __DIR__ . '/../data/prompts-template.json';
        $schemaJson = file_exists($schemaFile) ? file_get_contents($schemaFile) : '';
        $schemaArr = json_decode($schemaJson, true);
        $schemaFields = [];
        if (is_array($schemaArr) && count($schemaArr) > 0 && is_array($schemaArr[0])) {
            // Infer field types from the first object
            foreach ($schemaArr[0] as $k => $v) {
                $schemaFields[$k] = is_array($v) ? 'array' : 'string';
            }
        } else {
            error_log("[prompts.php] Could not load canonical schema, aborting batch_import");
            send_json(['ok' => false, 'error' => 'Canonical schema missing or invalid'], 500);
        }

        foreach ($promptsArr as $idx => $p) {
            $err = [];
            if (!is_array($p)) {
                $err[] = "Not an object";
            } else {
                // Validate schema
                $schemaErrs = validate_prompt_schema($p, $schemaFields);
                if (count($schemaErrs) > 0) {
                    $err = array_merge($err, $schemaErrs);
                }
                // Check for duplicate id
                if (isset($p['id']) && isset($existingIds[$p['id']])) {
                    $err[] = "Duplicate id: " . $p['id'];
                }
            }
            if (count($err) > 0) {
                $skipped[] = $p;
                $errors[] = [
                    'index' => $idx,
                    'id' => isset($p['id']) ? $p['id'] : null,
                    'title' => isset($p['title']) ? $p['title'] : null,
                    'errors' => $err
                ];
                continue;
            }
            // Passed validation, add to imported and existingPrompts
            $imported[] = $p;
            $existingPrompts[] = $p;
            if (isset($p['id'])) {
                $existingIds[$p['id']] = true;
            }
        }
        // Write only if there are imported prompts
        if (count($imported) > 0) {
            write_prompts($DATA_FILE, $existingPrompts);
        }
        error_log("[prompts.php] Batch import: imported=" . count($imported) . ", skipped=" . count($skipped));
        send_json([
            'ok' => true,
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors
        ]);
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
    // Cascade delete: remove related comments and results
    $commentsFile = __DIR__ . '/../comments.json';
    $resultsFile = __DIR__ . '/../results.json';
    // Remove comments
    if (file_exists($commentsFile)) {
        $comments = json_decode(file_get_contents($commentsFile), true);
        $comments = is_array($comments) ? $comments : [];
        $filteredComments = array_values(array_filter($comments, function($c) use ($id) {
            return !isset($c['prompt_id']) || $c['prompt_id'] !== $id;
        }));
        file_put_contents($commentsFile, json_encode($filteredComments, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    // Remove results
    if (file_exists($resultsFile)) {
        $results = json_decode(file_get_contents($resultsFile), true);
        $results = is_array($results) ? $results : [];
        $filteredResults = array_values(array_filter($results, function($r) use ($id) {
            return !isset($r['prompt_id']) || $r['prompt_id'] !== $id;
        }));
        file_put_contents($resultsFile, json_encode($filteredResults, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
    error_log("[prompts.php] Deleted prompt id: " . $id . " and cascaded deletes for comments/results");
    send_json(['ok' => true]);
}

// Fallback: method not allowed
error_log("[prompts.php] Method not allowed: " . $_SERVER['REQUEST_METHOD']);
send_json(['ok' => false, 'error' => 'Method not allowed'], 405);
<?php

error_log("🔥 Sync.php has started at " . date("Y-m-d H:i:s"));

// sync.php
header("Content-Type: application/json");

// --- Load server private key ---
$privateKeyPath = __DIR__ . "/keys/private.pem";
if (!file_exists($privateKeyPath)) {
    echo json_encode(["status" => "error", "message" => "Server private key missing"]);
    exit;
}
$privateKey = openssl_pkey_get_private(file_get_contents($privateKeyPath));

// --- Get encrypted input ---
$raw = file_get_contents("php://input");
if (!$raw) {
    echo json_encode(["status" => "error", "message" => "No input"]);
    exit;
}

$input = json_decode($raw, true);
if (!$input || !isset($input["ekey"]) || !isset($input["ct"]) || !isset($input["tag"])) {
    echo json_encode(["status" => "error", "message" => "Invalid encrypted payload"]);
    exit;
}

error_log("📥 Got ekey: " . substr($input["ekey"], 0, 100));
error_log("📥 Got ct: " . substr($input["ct"], 0, 100));
error_log("📥 Got tag: " . $input["tag"]);

// --- Step 1: Unwrap AES key + IV with server private key ---
$wrappedKey = base64_decode($input["ekey"]);
if (!openssl_private_decrypt($wrappedKey, $keyiv_raw, $privateKey, OPENSSL_PKCS1_OAEP_PADDING)) {
    echo json_encode(["status" => "error", "message" => "Failed to unwrap session key"]);
    exit;
}

// keyiv_raw = 32 bytes AES key || 12 bytes IV
$key_bin = substr($keyiv_raw, 0, 32);
$iv_bin  = substr($keyiv_raw, 32, 12);

// --- Step 2: Decrypt payload with AES-GCM ---
$ciphertext = base64_decode($input["ct"]);
$tag        = base64_decode($input["tag"]);

$plaintext = openssl_decrypt(
    $ciphertext . $tag, "aes-256-gcm",
    $key_bin, OPENSSL_RAW_DATA,
    $iv_bin, $tag
);

if ($plaintext === false) {
    echo json_encode(["status" => "error", "message" => "AES decryption failed"]);
    exit;
}

$payload = json_decode($plaintext, true);
if (!$payload || !isset($payload["action"])) {
    echo json_encode(["status" => "error", "message" => "Invalid payload after decryption"]);
    exit;
}

// -------------------------------------------------------------------
// BUSINESS LOGIC (add/remove/update/recalculate)
// -------------------------------------------------------------------
$dataFile = __DIR__ . "/data/employees.json";
$employees = [];
if (file_exists($dataFile)) {
    $employees = json_decode(file_get_contents($dataFile), true);
    if (!is_array($employees)) $employees = [];
}

$action = $payload["action"];

if ($action === "get") {
    // just return current employees
} elseif ($action === "add") {
    $newId = rand(100000, 999999);
    $emp = [
        "id" => $newId,
        "name" => $payload["name"] ?? "Unknown",
        "position" => $payload["position"] ?? "Unknown",
        "hoursWorked" => 0,
        "difficulty" => 1,
        "projectsCompleted" => 0,
        "score" => 0
    ];
    $employees[] = $emp;

} elseif ($action === "remove") {
    $id = $payload["id"];
    $employees = array_values(array_filter($employees, fn($e) => $e["id"] != $id));

} elseif ($action === "update") {
    $id = $payload["id"];
    foreach ($employees as &$emp) {
        if ($emp["id"] == $id) {
            if (isset($payload["hoursWorked"])) $emp["hoursWorked"] = intval($payload["hoursWorked"]);
            if (isset($payload["difficulty"])) $emp["difficulty"] = intval($payload["difficulty"]);
            if (isset($payload["projectsCompleted"])) $emp["projectsCompleted"] = intval($payload["projectsCompleted"]);
        }
    }

} elseif ($action === "recalculate") {
    // call score.exe with employees.json
    $cmd = __DIR__ . "/score.exe";
    $proc = proc_open($cmd, [
        0 => ["pipe", "r"],
        1 => ["pipe", "w"],
        2 => ["pipe", "w"]
    ], $pipes);

    if (is_resource($proc)) {
        fwrite($pipes[0], json_encode($employees));
        fclose($pipes[0]);
        $result = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($proc);

        $employees = json_decode($result, true) ?: $employees;
    }
}

// Save
file_put_contents($dataFile, json_encode($employees, JSON_PRETTY_PRINT));

// -------------------------------------------------------------------
// ENCRYPT RESPONSE BACK TO CLIENT
// -------------------------------------------------------------------
$response = json_encode(["status" => "success", "employees" => $employees]);

// generate new AES session key + iv
$key_bin = random_bytes(32);
$iv_bin  = random_bytes(12);

// encrypt response (tag is returned separately)
$ciphertext = openssl_encrypt(
    $response, "aes-256-gcm",
    $key_bin, OPENSSL_RAW_DATA,
    $iv_bin, $tag
);

// wrap AES key+iv with client pubkey
$clientPub = $input["clientPub"] ?? null;
if (!$clientPub) {
    echo json_encode(["status" => "error", "message" => "Missing clientPub"]);
    exit;
}

// Ensure PEM formatting
$clientPub = preg_replace(
    '/(-----BEGIN PUBLIC KEY-----|-----END PUBLIC KEY-----)/',
    "$1\n",
    trim($clientPub)
);
$clientPub = preg_replace('/\s+/', "\n", $clientPub);

$clientPub = preg_replace('/\s+/', '', $clientPub); // strip all whitespace
$clientPub = chunk_split($clientPub, 64, "\n");     // wrap at 64 chars
$clientPub = "-----BEGIN PUBLIC KEY-----\n" . $clientPub . "-----END PUBLIC KEY-----\n";

$clientKey = openssl_pkey_get_public($clientPub);
if (!$clientKey) {
    echo json_encode([
        "status" => "error",
        "message" => "Invalid client public key",
        "openssl_error" => openssl_error_string()
    ]);
    exit;
}

// ✅ Debugging logs (go to Apache/PHP error log)
error_log("WrappedKeyResp length: " . strlen($wrappedKeyResp));
error_log("Base64 WrappedKeyResp: " . base64_encode($wrappedKeyResp));
error_log("👉 Sending ekey: " . base64_encode($wrappedKeyResp));

if ($wrappedKeyResp === false) {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to wrap AES key with client public key",
        "openssl_error" => openssl_error_string()
    ]);
    exit;
}

if (!openssl_public_encrypt($key_bin . $iv_bin, $wrappedKeyResp, $clientKey, OPENSSL_PKCS1_OAEP_PADDING)) {
    echo json_encode([
        "status" => "error",
        "message" => "Failed to wrap AES key",
        "openssl_error" => openssl_error_string()
    ]);
    exit;
}
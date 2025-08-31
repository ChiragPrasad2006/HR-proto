<?php
require __DIR__ . "/aes_gcm.php";   // include the AES-GCM helpers

// Paths
$dataFile = __DIR__ . "/data/employees.json";
$cppExe   = __DIR__ . "/score.exe";

// --- STEP 1: Receive Encrypted Payload ---
$raw = file_get_contents("php://input");
if (!$raw) {
    echo json_encode(["status" => "error", "message" => "No input"]);
    exit;
}
$enc = json_decode($raw, true);
if (!$enc || !isset($enc["ekey"], $enc["ct"], $enc["tag"], $enc["clientPub"])) {
    echo json_encode(["status" => "error", "message" => "Invalid encrypted payload"]);
    exit;
}

// --- STEP 2: Unwrap AES key+IV with server private key ---
$serverPrivPem = file_get_contents(__DIR__ . "/keys/private.pem");
$serverPriv = openssl_pkey_get_private($serverPrivPem);

$ekey_bin = base64_decode($enc["ekey"]);
$keyiv = "";
if (!openssl_private_decrypt($ekey_bin, $keyiv, $serverPriv, OPENSSL_PKCS1_OAEP_PADDING)) {
    echo json_encode(["status" => "error", "message" => "RSA unwrap failed"]);
    exit;
}

// Split into key (32 bytes) + iv (12 bytes)
$keyBytes = substr($keyiv, 0, 32);
$iv       = substr($keyiv, 32, 12);

// --- STEP 3: Decrypt actual payload (JSON) ---
try {
    $payloadJson = aes_gcm_decrypt($enc["ct"], $enc["tag"], $keyBytes, $iv);
    $payload = json_decode($payloadJson, true);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
    exit;
}

if (!is_array($payload) || !isset($payload["action"])) {
    echo json_encode(["status" => "error", "message" => "Bad request"]);
    exit;
}

$action = $payload["action"];

// --- STEP 4: Load existing employees ---
$employees = [];
if (file_exists($dataFile)) {
    $employees = json_decode(file_get_contents($dataFile), true);
    if (!is_array($employees)) $employees = [];
}

// --- STEP 5: Apply Action ---
if ($action === "get") {
    // just return
} elseif ($action === "add") {
    $newId = rand(100000, 999999);
    $employees[] = [
        "id" => $newId,
        "name" => $payload["name"] ?? "Unknown",
        "position" => $payload["position"] ?? "Unknown",
        "hoursWorked" => (int)($payload["hoursWorked"] ?? 0),
        "difficulty" => (int)($payload["difficulty"] ?? 1),
        "projectsCompleted" => (int)($payload["projectsCompleted"] ?? 0),
        "score" => (int)($payload["score"] ?? 0)
    ];
} elseif ($action === "remove") {
    $id = $payload["id"] ?? null;
    if ($id) {
        $employees = array_values(array_filter($employees, fn($e) => $e["id"] != $id));
    }
} elseif ($action === "update") {
    $id = $payload["id"] ?? null;
    if ($id) {
        foreach ($employees as &$emp) {
            if ($emp["id"] == $id) {
                if (isset($payload["hoursWorked"])) $emp["hoursWorked"] = (int)$payload["hoursWorked"];
                if (isset($payload["difficulty"])) $emp["difficulty"] = (int)$payload["difficulty"];
                if (isset($payload["projectsCompleted"])) $emp["projectsCompleted"] = (int)$payload["projectsCompleted"];
                break;
            }
        }
    }
} elseif ($action === "recalculate") {
    // call C++ program
    $proc = proc_open($cppExe, [
        0 => ["pipe", "r"], 1 => ["pipe", "w"], 2 => ["pipe", "w"]
    ], $pipes);
    if (is_resource($proc)) {
        fwrite($pipes[0], json_encode($employees));
        fclose($pipes[0]);
        $out = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        proc_close($proc);
        $employees = json_decode($out, true) ?: $employees;
    }
}

// save updated
file_put_contents($dataFile, json_encode($employees, JSON_PRETTY_PRINT));

// --- STEP 6: Encrypt Response Back to Client ---
$response = ["status" => "success", "employees" => $employees];
list($ct, $tag) = aes_gcm_encrypt(json_encode($response), $keyBytes, $iv);

// wrap again for client: reuse same AES key+iv
$clientPub = openssl_pkey_get_public($enc["clientPub"]);
$keyiv_bin = $keyBytes . $iv;
$ekey_resp = "";
openssl_public_encrypt($keyiv_bin, $ekey_resp, $clientPub, OPENSSL_PKCS1_OAEP_PADDING);

// send back
echo json_encode([
    "ekey" => base64_encode($ekey_resp),
    "ct"   => $ct,
    "tag"  => $tag
]);

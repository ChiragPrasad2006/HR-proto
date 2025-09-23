<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . "/aes_file.php";

$keyPath = __DIR__ . "/keys/aes_key.b64";
$encPath = __DIR__ . "/data/employees.json.enc";
$decPath = __DIR__ . "/data/employees.json";

try {
    $plain = load_encrypted_json_file($encPath, $keyPath);
    if ($plain === false) {
        echo "❌ No encrypted file found.";
    } else {
        file_put_contents($decPath, $plain);
        header("Content-Type: application/json");
        echo $plain; // ✅ just send the JSON, no extra text

    }
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}

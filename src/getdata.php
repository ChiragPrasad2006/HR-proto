<?php
require __DIR__ . "/aes_file.php";

$keyPath = __DIR__ . "/keys/aes_key.b64";
$encPath = __DIR__ . "/data/employees.json.enc";

header("Content-Type: application/json; charset=utf-8");

try {
    $plain = load_encrypted_json_file($encPath, $keyPath);
    if ($plain === false) {
        echo json_encode([]); 
        exit;
    }
    echo $plain;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status"=>"error","message"=>$e->getMessage()]);
}

<?php
// save_export.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$input = file_get_contents("php://input");
if (!$input) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "No input received"]);
    exit;
}

// Save to data/employees.json (overwrite)
$path = __DIR__ . "/data/employees.json";
file_put_contents($path, $input);

echo json_encode(["status" => "success"]);
?>
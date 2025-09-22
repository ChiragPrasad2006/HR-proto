<?php
// get_export.php
header("Access-Control-Allow-Origin: *"); // Allow all origins
header("Content-Type: application/json");

$path = __DIR__ . "/data/employees.json";

if (!file_exists($path)) {
    http_response_code(404);
    echo json_encode(["status" => "error", "message" => "No file found"]);
    exit;
}

echo file_get_contents($path);
?>
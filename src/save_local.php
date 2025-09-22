<?php
header("Content-Type: application/json");
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data["data"])) {
    echo json_encode(["status"=>"error","message"=>"No data provided"]);
    exit;
}

$encPath = __DIR__ . "/data/employees.json.enc";
file_put_contents($encPath, $data["data"]);

echo json_encode(["status"=>"success"]);
?>
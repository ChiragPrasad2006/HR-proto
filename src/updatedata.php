<?php
require __DIR__ . "/aes_file.php";

$keyPath = __DIR__ . "/keys/aes_key.b64";
$encPath = __DIR__ . "/data/employees.json.enc";

// Load employees
try {
    $plain = load_encrypted_json_file($encPath, $keyPath);
    $employees = $plain ? json_decode($plain, true) : [];
    if (!is_array($employees)) $employees = [];
} catch (Exception $e) {
    $employees = [];
}

$input = json_decode(file_get_contents("php://input"), true);
if (!$input || !isset($input["action"])) {
    echo json_encode(["status"=>"error","message"=>"Invalid request"]);
    exit;
}

$action = $input["action"];

// Actions
if ($action === "add") {
    $newId = rand(100000,999999);
    $employees[] = [
        "id"=>$newId,
        "name"=>$input["name"] ?? "Unknown",
        "position"=>$input["position"] ?? "Unknown",
        "hoursWorked"=>$input["hoursWorked"] ?? 0,
        "difficulty"=>$input["difficulty"] ?? 1,
        "projectsCompleted"=>$input["projectsCompleted"] ?? 0,
        "score"=>0
    ];
} elseif ($action === "remove") {
    $id = $input["id"];
    $employees = array_values(array_filter($employees, fn($e)=>$e["id"]!=$id));
} elseif ($action === "update") {
    $id = $input["id"];
    foreach ($employees as &$emp) {
        if ($emp["id"] == $id) {
            if (isset($input["hoursWorked"])) $emp["hoursWorked"]=(int)$input["hoursWorked"];
            if (isset($input["difficulty"])) $emp["difficulty"]=(int)$input["difficulty"];
            if (isset($input["projectsCompleted"])) $emp["projectsCompleted"]=(int)$input["projectsCompleted"];
        }
    }
}elseif ($action === "replace_all") {
    $employees = $input["data"];
}

// Save encrypted
$jsonStr = json_encode($employees, JSON_PRETTY_PRINT);
save_encrypted_json_file($jsonStr, $encPath, $keyPath);

// Respond
echo json_encode(["status"=>"success","employees"=>$employees]);

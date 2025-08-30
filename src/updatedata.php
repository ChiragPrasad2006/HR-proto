<?php
// updatedata.php
header("Content-Type: application/json");

$dataFile = __DIR__ . "/data/employees.json";

// Load existing employees
$employees = [];
if (file_exists($dataFile)) {
    $employees = json_decode(file_get_contents($dataFile), true);
    if (!is_array($employees)) {
        $employees = [];
    }
}

// Get request body
$input = json_decode(file_get_contents("php://input"), true);
if (!$input || !isset($input["action"])) {
    echo json_encode(["status" => "error", "message" => "Invalid request"]);
    exit;
}

$action = $input["action"];

// --- Handle Actions ---
if ($action === "add") {
    // Generate new ID
    $newId = rand(100000, 999999);

    // Add new employee (✅ use $input not $data)
    $emp = [
        "id" => $newId,
        "name" => $input["name"] ?? "Unknown",
        "position" => $input["position"] ?? "Unknown",
        "hoursWorked" => isset($input["hoursWorked"]) ? (int)$input["hoursWorked"] : 0,
        "difficulty" => isset($input["difficulty"]) ? (int)$input["difficulty"] : 1, // store as int
        "projectsCompleted" => isset($input["projectsCompleted"]) ? (int)$input["projectsCompleted"] : 0,
        "score" => isset($input["score"]) ? (int)$input["score"] : 0
    ];

    $employees[] = $emp;

} elseif ($action === "remove") {
    // Remove employee by ID
    $id = $input["id"];
    $employees = array_values(array_filter($employees, fn($emp) => $emp["id"] != $id));

} elseif ($action === "update") {
    // Update existing employee productivity data
    $id = $input["id"];
    foreach ($employees as &$emp) {
        if ($emp["id"] == $id) {
            if (isset($input["hoursWorked"])) $emp["hoursWorked"] = intval($input["hoursWorked"]);
            if (isset($input["difficulty"])) $emp["difficulty"] = (int)$input["difficulty"]; // force int
            if (isset($input["projectsCompleted"])) $emp["projectsCompleted"] = intval($input["projectsCompleted"]);
            break;
        }
    }
}

// Save back to JSON file
file_put_contents($dataFile, json_encode($employees, JSON_PRETTY_PRINT));

// Return updated employees
echo json_encode(["status" => "success", "employees" => $employees]);

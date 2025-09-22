<?php
require __DIR__ . "/aes_file.php";

$keyPath = "C:\\xampp\htdocs\hr-proto\src\keys\aes_key.b64";
$encPath = __DIR__ . "/data/employees.json.enc";

// load
$plain = load_encrypted_json_file($encPath, $keyPath);
$employees = $plain ? json_decode($plain, true) : [];

// run score.exe
$cmd = __DIR__ . "/score.exe";
$descriptorspec = [
    0 => ["pipe", "r"],
    1 => ["pipe", "w"],
    2 => ["pipe", "w"]
];

$process = proc_open($cmd, $descriptorspec, $pipes);

if (is_resource($process)) {
    fwrite($pipes[0], json_encode($employees));
    fclose($pipes[0]);
    $result = stream_get_contents($pipes[1]);
    fclose($pipes[1]);
    $errors = stream_get_contents($pipes[2]);
    fclose($pipes[2]);
    proc_close($process);

    if ($errors) {
        echo "Error: " . $errors;
        exit;
    }

    // save back encrypted
    save_encrypted_json_file($result, $encPath, $keyPath);
    echo "Scores updated!";
}

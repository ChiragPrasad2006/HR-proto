<?php
// Path to JSON
$jsonFile = __DIR__ . "/data/employees.json";
$data = file_get_contents($jsonFile);

// Run C++ program with JSON as input
$cmd = __DIR__ . "/score.exe";   // compiled C++ program
$descriptorspec = [
    0 => ["pipe", "r"],  // stdin
    1 => ["pipe", "w"],  // stdout
    2 => ["pipe", "w"]   // stderr
];

$process = proc_open($cmd, $descriptorspec, $pipes);

if (is_resource($process)) {
    fwrite($pipes[0], $data);
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

    // Save updated JSON
    file_put_contents($jsonFile, $result);

    echo "Scores updated!";
}
?>

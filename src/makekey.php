<?php
require __DIR__ . "/aes_file.php";
$path = "C:\\hr-proto-keys\\aes_key.b64";
if (!is_dir(dirname($path))) mkdir(dirname($path));
generate_save_key($path);
echo "Key created at $path\n";
?>
<?php
require __DIR__ . "/aes_file.php";
$path = __DIR__ . "/keys/aes_key.b64";
if (!is_dir(dirname($path))) mkdir(dirname($path));
generate_save_key($path);

?>
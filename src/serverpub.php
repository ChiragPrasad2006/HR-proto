<?php
// serverpub.php
header("Content-Type: text/plain");

// Path to public key
$publicKeyPath = __DIR__ . "/keys/public.pem";

// Send the public key to the client
if (file_exists($publicKeyPath)) {
    echo file_get_contents($publicKeyPath);
} else {
    echo "Error: Public key not found";
}
?>

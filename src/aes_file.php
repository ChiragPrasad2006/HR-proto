<?php
// encryption of employees.json

function load_key_from_file(string $path) {
    if (!file_exists($path)) throw new Exception("Key file missing: $path");
    $b64 = trim(file_get_contents($path));
    return base64_decode($b64);
}

// generate key file
function generate_save_key(string $path) {
    if (file_exists($path)) return; 
    $key = random_bytes(32);
    file_put_contents($path, base64_encode($key));
    @chmod($path, 0600);
}

// encrypt plaintext
function encrypt_string_for_file(string $plaintext, string $key): array {
    $iv = random_bytes(12);
    $tag = "";
    $ciphertext = openssl_encrypt($plaintext, "aes-256-gcm", $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($ciphertext === false) throw new Exception("AES encrypt failed");
    return [
        "ct"  => base64_encode($ciphertext),
        "iv"  => base64_encode($iv),
        "tag" => base64_encode($tag)
    ];
}

// Decrypt
function decrypt_string_from_file(string $ct_b64, string $iv_b64, string $tag_b64, string $key): string {
    $ct = base64_decode($ct_b64);
    $iv = base64_decode($iv_b64);
    $tag = base64_decode($tag_b64);
    $pt = openssl_decrypt($ct, "aes-256-gcm", $key, OPENSSL_RAW_DATA, $iv, $tag);
    if ($pt === false) throw new Exception("AES decrypt failed or tag mismatch");
    return $pt;
}

// Save encrypted JSON
function save_encrypted_json_file(string $jsonStr, string $filePath, string $keyPath) {
    $key = load_key_from_file($keyPath);
    $enc = encrypt_string_for_file($jsonStr, $key);
    $store = json_encode($enc, JSON_PRETTY_PRINT);
    $tmp = $filePath . ".tmp";
    file_put_contents($tmp, $store);
    rename($tmp, $filePath);
}

// Load decrypted JSON
function load_encrypted_json_file(string $filePath, string $keyPath) {
    if (!file_exists($filePath)) return false;
    $blob = json_decode(file_get_contents($filePath), true);
    if (!isset($blob["ct"], $blob["iv"], $blob["tag"])) throw new Exception("Invalid encrypted file format");
    $key = load_key_from_file($keyPath);
    return decrypt_string_from_file($blob["ct"], $blob["iv"], $blob["tag"], $key);
}

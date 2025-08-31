<?php
// ---------- AES-GCM ENCRYPTION/DECRYPTION HELPERS ----------
// Requires PHP 7.1+ with OpenSSL compiled with GCM support

function aes_gcm_encrypt(string $plaintext, string $key, string $iv): array {
    // $key: 32 bytes (AES-256)
    // $iv:  12 bytes recommended
    $tag = "";
    $ciphertext = openssl_encrypt(
        $plaintext,
        "aes-256-gcm",
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag,
        "",     // aad (not used here)
        16      // tag length
    );
    if ($ciphertext === false) {
        throw new Exception("AES-GCM encryption failed: " . openssl_error_string());
    }
    return [
        base64_encode($ciphertext),
        base64_encode($tag)
    ];
}

function aes_gcm_decrypt(string $ct_b64, string $tag_b64, string $key, string $iv): string {
    $ciphertext = base64_decode($ct_b64);
    $tag = base64_decode($tag_b64);
    $plaintext = openssl_decrypt(
        $ciphertext,
        "aes-256-gcm",
        $key,
        OPENSSL_RAW_DATA,
        $iv,
        $tag,
        "" // aad
    );
    if ($plaintext === false) {
        throw new Exception("AES-GCM decryption failed: " . openssl_error_string());
    }
    return $plaintext;
}

// ---------- crypto helpers (browser) ----------
// new

const SERVER_PUB_URL = "serverpub.php"; // or serverpub.php if you created it
const STORAGE_KEY = "data/employees.json"; // where client stores exported keys

const textEncoder = new TextEncoder();  
const textDecoder = new TextDecoder();

// util: arrayBuffer <-> base64
function ab2b64(ab) {
  const bytes = new Uint8Array(ab);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
function b642ab(b64) {
  const binary = atob(b64);
  const len = binary.length;
  const ab = new Uint8Array(len);
  for (let i = 0; i < len; i++) ab[i] = binary.charCodeAt(i);
  return ab.buffer;
}

// export SPKI PEM from CryptoKey (public)
async function exportPublicKeyToPem(spkiKey) {
  const spki = await crypto.subtle.exportKey("spki", spkiKey);
  const b64 = ab2b64(spki);
  const pem = "-----BEGIN PUBLIC KEY-----\n" + b64.match(/.{1,64}/g).join("\n") + "\n-----END PUBLIC KEY-----";
  return pem;
}
// export PKCS8 PEM from private key
async function exportPrivateKeyToPem(pkcs8Key) {
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pkcs8Key);
  const b64 = ab2b64(pkcs8);
  const pem = "-----BEGIN PRIVATE KEY-----\n" + b64.match(/.{1,64}/g).join("\n") + "\n-----END PRIVATE KEY-----";
  return pem;
}
// import PEM to CryptoKey (public SPKI)
async function importPublicKeyFromPem(pem) {
  const b64 = pem.replace(/-----.*-----/g, "").replace(/\s+/g, "");
  const spki = b642ab(b64);
  return crypto.subtle.importKey("spki", spki, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["encrypt"]);
}
// import private key PEM (pkcs8)
async function importPrivateKeyFromPem(pem) {
  const b64 = pem.replace(/-----.*-----/g, "").replace(/\s+/g, "");
  const pkcs8 = b642ab(b64);
  return crypto.subtle.importKey("pkcs8", pkcs8, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
}

// create RSA keypair (RSA-OAEP, 2048)
async function generateClientKeypair() {
  const kp = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1,0,1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  );
  return kp; // { publicKey, privateKey }
}

// persist keys to localStorage (store PEMs)
async function saveClientKeysToStorage(publicKey, privateKey) {
  const pubPem = await exportPublicKeyToPem(publicKey);
  const privPem = await exportPrivateKeyToPem(privateKey);
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ pubPem, privPem }));
}
async function loadClientKeysFromStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const { pubPem, privPem } = JSON.parse(raw);
    const publicKey = await importPublicKeyFromPem(pubPem);
    const privateKey = await importPrivateKeyFromPem(privPem);
    return { publicKey, privateKey, pubPem, privPem };
  } catch (e) {
    console.error("Failed to load keys from storage:", e);
    return null;
  }
}

// convenience: ensure client has RSA keypair (generate once)
async function initClientKeys() {
  let keys = await loadClientKeysFromStorage();
  if (keys) return keys;
  const kp = await generateClientKeypair();
  await saveClientKeysToStorage(kp.publicKey, kp.privateKey);
  const pubPem = await exportPublicKeyToPem(kp.publicKey);
  const privPem = await exportPrivateKeyToPem(kp.privateKey);
  return { publicKey: kp.publicKey, privateKey: kp.privateKey, pubPem, privPem };
}

// fetch server public PEM and import as CryptoKey
async function loadServerPublicKey() {
  const r = await fetch(SERVER_PUB_URL);
  const pem = await r.text();
  return importPublicKeyFromPem(pem);
}

// AES-GCM helper: returns { keyRaw (ArrayBuffer), keyCrypto (CryptoKey), iv (Uint8Array) }
async function generateAesGcmKey() {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit recommended
  return { keyRaw: raw, keyCrypto: key, iv };
}

// AES-GCM encrypt that returns { ct_b64, tag_b64 } (we separate tag to be compatible with PHP)
async function aesGcmEncryptSeparate(plaintextStr, keyCrypto, iv) {
  const pt = textEncoder.encode(plaintextStr);
  const combined = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, keyCrypto, pt);
  // combined contains ciphertext || tag (tag is 16 bytes)
  const comb = new Uint8Array(combined);
  const tag = comb.slice(comb.length - 16);
  const ct = comb.slice(0, comb.length - 16);
  return { ct_b64: ab2b64(ct.buffer), tag_b64: ab2b64(tag.buffer) };
}

// AES-GCM decrypt given b64 ct & tag, keyRaw & iv
async function aesGcmDecryptSeparate(ct_b64, tag_b64, keyRaw, iv) {
  const ct = new Uint8Array(b642ab(ct_b64));
  const tag = new Uint8Array(b642ab(tag_b64));
  // re-concatenate as combined ciphertext+tag
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);
  const key = await crypto.subtle.importKey("raw", keyRaw, "AES-GCM", false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, combined.buffer);
  return textDecoder.decode(decrypted);
}

// RSA-OAEP encrypt (wrap key) with server public key (CryptoKey)
async function rsaWrapKeyWithServer(serverPubKey, keyAndIvArrayBuffer) {
  // serverPubKey: CryptoKey imported from server's SPKI PEM
  const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, serverPubKey, keyAndIvArrayBuffer);
  return ab2b64(wrapped);
}
// RSA-OAEP decrypt (unwrap) with client's private key
async function rsaUnwrapKeyWithClient(clientPrivateKey, wrappedB64) {
  console.log("🔑 Wrapped ekey (raw from server):", wrappedB64); // add this
  const wrapped = b642ab(wrappedB64); // fails here if string is bad
  const raw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, clientPrivateKey, wrapped);
  return raw; 
}


// ---------- high-level: encrypt payload for server ----------
async function encryptPayloadForServer(plaintextObj, serverPubKey, clientKeys) {
  // 1) generate AES key & iv
  const { keyRaw, keyCrypto, iv } = await generateAesGcmKey();

  // 2) encrypt payload with AES-GCM
  const plaintextStr = JSON.stringify(plaintextObj);
  const { ct_b64, tag_b64 } = await aesGcmEncryptSeparate(plaintextStr, keyCrypto, iv);

  // 3) wrap key||iv with server public key
  // concat keyRaw (32 bytes) + iv (12 bytes)
  const keyBytes = new Uint8Array(keyRaw);
  const keyiv = new Uint8Array(keyBytes.length + iv.length);
  keyiv.set(keyBytes, 0);
  keyiv.set(iv, keyBytes.length);

  const ekey_b64 = await rsaWrapKeyWithServer(serverPubKey, keyiv.buffer);

  // 4) return object to send; include client's public PEM
  const payload = {
    ekey: ekey_b64,
    ct: ct_b64,
    tag: tag_b64,
    clientPub: clientKeys.pubPem
  };
  console.log("📤 Sending encrypted ekey:", payload.ekey);
  return payload;

}

// ---------- high-level: decrypt server response ----------
async function decryptServerResponse(respObj, clientPrivateKey) {
  // respObj: { ekey, ct, tag } base64 strings
  const keyiv_ab = await rsaUnwrapKeyWithClient(clientPrivateKey, respObj.ekey);
  // keyiv_ab: ArrayBuffer [32 + 12]
  const keyiv = new Uint8Array(keyiv_ab);
  const keyRaw = keyiv.slice(0, 32).buffer;
  const iv = new Uint8Array(keyiv.slice(32, 44));
  const plaintextStr = await aesGcmDecryptSeparate(respObj.ct, respObj.tag, keyRaw, iv);
  return JSON.parse(plaintextStr);
}

// ---------- unified sendToServer wrapper ----------
let _serverPubKey = null;
let _clientKeys = null;

async function sendToServer(payload) {
  // 1. ensure keys loaded
  if (!_clientKeys) {
    _clientKeys = await initClientKeys();
  }
  if (!_serverPubKey) {
    _serverPubKey = await loadServerPublicKey();
  }

  // 2. encrypt payload
  const encrypted = await encryptPayloadForServer(payload, _serverPubKey, _clientKeys);

  // 3. POST to sync.php
  const res = await fetch("sync.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(encrypted)
  });

  const respObj = await res.json();

  // 4. decrypt response
  const decrypted = await decryptServerResponse(respObj, _clientKeys.privateKey);
  return decrypted;
}


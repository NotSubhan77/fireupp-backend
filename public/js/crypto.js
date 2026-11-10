/**
 * Tele end-to-end encryption primitives (WebCrypto). Works in the browser and in Node ≥ 20.
 *
 *  password ──PBKDF2(310k, per-user salt)──► 512 bits
 *     ├─ first 256 bits  → authKey  (sent to the server, which stores only scrypt(authKey))
 *     └─ last 256 bits   → encKey   (never leaves the device; wraps the user's private keys)
 *
 *  Identity: ECDH P-256 key pair. Private key + a personal "vault" AES key are stored
 *  on the server only in wrapped (AES-GCM, encKey) form.
 *
 *  Chats: each chat has a random AES-256-GCM key per version. It is wrapped for every
 *  member with ECDH(wrapper private, member public). Removing a member rotates the key.
 *  Files: a random AES key per file; each chunk is sealed as iv(12) || ciphertext.
 */
(function (root) {
  const subtle = globalThis.crypto.subtle;
  const te = new TextEncoder();
  const td = new TextDecoder();

  const b64 = buf => {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const rand = n => globalThis.crypto.getRandomValues(new Uint8Array(n));
  const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

  async function deriveMaster(password, saltB64) {
    const base = await subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', salt: unb64(saltB64), iterations: 310000, hash: 'SHA-256' }, base, 512));
    return {
      authKey: hex(bits.slice(0, 32)),
      encKey: await subtle.importKey('raw', bits.slice(32), 'AES-GCM', false, ['encrypt', 'decrypt'])
    };
  }

  async function seal(key, bytes) {
    const iv = rand(12);
    return { iv: b64(iv), ct: b64(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes)) };
  }
  async function open(key, box) {
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct)));
  }
  const encryptJSON = (key, obj) => seal(key, te.encode(JSON.stringify(obj)));
  const decryptJSON = async (key, box) => JSON.parse(td.decode(await open(key, box)));

  const importKey = rawB64 => subtle.importKey('raw', unb64(rawB64), 'AES-GCM', false, ['encrypt', 'decrypt']);
  const importPrivate = jwk => subtle.importKey('jwk', jwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
  const importPublic = jwkStr => subtle.importKey('jwk', JSON.parse(jwkStr), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const newKeyRaw = () => b64(rand(32));

  async function generateIdentity(encKey) {
    const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
    const privJwk = await subtle.exportKey('jwk', kp.privateKey);
    const vaultRaw = rand(32);
    return {
      publicKey: JSON.stringify(await subtle.exportKey('jwk', kp.publicKey)),
      wrappedPrivateKey: await encryptJSON(encKey, privJwk),
      wrappedVaultKey: await seal(encKey, vaultRaw),
      privJwk,
      vaultRaw: b64(vaultRaw)
    };
  }

  async function unwrapIdentity(encKey, user) {
    return {
      privJwk: await decryptJSON(encKey, user.wrappedPrivateKey),
      vaultRaw: b64(await open(encKey, user.wrappedVaultKey))
    };
  }

  async function pairKey(myPrivate, theirPublicJwkStr) {
    return subtle.deriveKey({ name: 'ECDH', public: await importPublic(theirPublicJwkStr) }, myPrivate, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  const wrapKey = async (rawB64, myPrivate, theirPublic) => seal(await pairKey(myPrivate, theirPublic), unb64(rawB64));
  const unwrapKey = async (box, myPrivate, wrapperPublic) => b64(await open(await pairKey(myPrivate, wrapperPublic), box));

  async function encryptChunk(key, bytes) {
    const iv = rand(12);
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes));
    const out = new Uint8Array(12 + ct.length);
    out.set(iv, 0);
    out.set(ct, 12);
    return out;
  }
  async function decryptChunk(key, buf) {
    const b = new Uint8Array(buf);
    return new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv: b.subarray(0, 12) }, key, b.subarray(12)));
  }

  async function fingerprint(publicJwkStr) {
    const d = new Uint8Array(await subtle.digest('SHA-256', te.encode(publicJwkStr)));
    return hex(d.slice(0, 16)).match(/.{4}/g).join(' ');
  }

  const api = {
    b64, unb64, rand, deriveMaster, seal, open, encryptJSON, decryptJSON, importKey, importPrivate, importPublic,
    newKeyRaw, generateIdentity, unwrapIdentity, wrapKey, unwrapKey, encryptChunk, decryptChunk, fingerprint
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.E2E = api;
})(typeof window !== 'undefined' ? window : globalThis);

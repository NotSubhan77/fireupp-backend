package app.zovio.mobile.nativeapp.crypto

import android.os.Build
import android.util.Base64
import org.json.JSONObject
import java.math.BigInteger
import java.security.AlgorithmParameters
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.PrivateKey
import java.security.PublicKey
import java.security.SecureRandom
import java.security.interfaces.ECPrivateKey
import java.security.interfaces.ECPublicKey
import java.security.spec.ECGenParameterSpec
import java.security.spec.ECParameterSpec
import java.security.spec.ECPoint
import java.security.spec.ECPrivateKeySpec
import java.security.spec.ECPublicKeySpec
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.Mac
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * Pure-Kotlin WebCrypto-compatible E2EE primitives matching public/js/crypto.js.
 * - PBKDF2-HMAC-SHA256 (310,000 iterations, 512 bits -> authKey hex + encKey 32 bytes)
 * - ECDH P-256 (secp256r1) JWK <-> Java Key conversion & key unwrapping/wrapping
 * - AES-256-GCM seal/open + chunk seal/open (iv(12) || ciphertext)
 */
object ZovioCrypto {

    private val secureRandom = SecureRandom()

    private val ecSpec: ECParameterSpec by lazy {
        val params = AlgorithmParameters.getInstance("EC")
        params.init(ECGenParameterSpec("secp256r1"))
        params.getParameterSpec(ECParameterSpec::class.java)
    }

    data class MasterKeys(
        val authKeyHex: String,
        val encKeyBytes: ByteArray
    )

    data class IdentityBundle(
        val publicKeyJwk: String,
        val wrappedPrivateKey: JSONObject,
        val wrappedVaultKey: JSONObject,
        val privJwkJson: String,
        val vaultRawB64: String
    )

    fun b64(bytes: ByteArray): String = Base64.encodeToString(bytes, Base64.NO_WRAP)

    fun unb64(str: String): ByteArray = Base64.decode(str, Base64.DEFAULT)

    fun b64UrlNoPad(bytes: ByteArray): String =
        Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP)

    fun unb64Url(str: String): ByteArray {
        val norm = str.replace('-', '+').replace('_', '/')
        val pad = when (norm.length % 4) {
            2 -> "=="
            3 -> "="
            else -> ""
        }
        return Base64.decode(norm + pad, Base64.DEFAULT)
    }

    fun rand(n: Int): ByteArray = ByteArray(n).also { secureRandom.nextBytes(it) }

    fun hex(bytes: ByteArray): String = buildString(bytes.size * 2) {
        for (b in bytes) {
            append(((b.toInt() ushr 4) and 0xF).toString(16))
            append((b.toInt() and 0xF).toString(16))
        }
    }

    fun newKeyRaw(): String = b64(rand(32))

    fun deriveMaster(password: String, saltB64: String): MasterKeys {
        val salt = unb64(saltB64)
        val bits: ByteArray = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val spec = PBEKeySpec(password.toCharArray(), salt, 310_000, 512)
            factory.generateSecret(spec).encoded
        } else {
            pbkdf2HmacSha256(password.toByteArray(Charsets.UTF_8), salt, 310_000, 64)
        }
        val authBytes = bits.copyOfRange(0, 32)
        val encBytes = bits.copyOfRange(32, 64)
        return MasterKeys(authKeyHex = hex(authBytes), encKeyBytes = encBytes)
    }

    private fun pbkdf2HmacSha256(
        password: ByteArray,
        salt: ByteArray,
        iterations: Int,
        dkLen: Int
    ): ByteArray {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(password, "HmacSHA256"))
        val out = ByteArray(dkLen)
        val blockCount = (dkLen + 31) / 32
        var offset = 0
        for (blockIdx in 1..blockCount) {
            val intBytes = byteArrayOf(
                (blockIdx ushr 24).toByte(),
                (blockIdx ushr 16).toByte(),
                (blockIdx ushr 8).toByte(),
                blockIdx.toByte()
            )
            mac.update(salt)
            mac.update(intBytes)
            var u = mac.doFinal()
            val t = u.copyOf()
            for (i in 1 until iterations) {
                u = mac.doFinal(u)
                for (j in t.indices) {
                    t[j] = (t[j].toInt() xor u[j].toInt()).toByte()
                }
            }
            val copyLen = minOf(32, dkLen - offset)
            System.arraycopy(t, 0, out, offset, copyLen)
            offset += copyLen
        }
        return out
    }

    fun seal(keyBytes: ByteArray, plainBytes: ByteArray): JSONObject {
        val iv = rand(12)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        val ct = cipher.doFinal(plainBytes)
        return JSONObject()
            .put("iv", b64(iv))
            .put("ct", b64(ct))
    }

    fun open(keyBytes: ByteArray, box: JSONObject): ByteArray {
        val iv = unb64(box.getString("iv"))
        val ct = unb64(box.getString("ct"))
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        return cipher.doFinal(ct)
    }

    fun encryptJson(keyBytes: ByteArray, obj: JSONObject): JSONObject =
        seal(keyBytes, obj.toString().toByteArray(Charsets.UTF_8))

    fun decryptJson(keyBytes: ByteArray, box: JSONObject): JSONObject =
        JSONObject(String(open(keyBytes, box), Charsets.UTF_8))

    fun encryptChunk(keyBytes: ByteArray, plainBytes: ByteArray): ByteArray {
        val iv = rand(12)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        val ct = cipher.doFinal(plainBytes)
        val out = ByteArray(12 + ct.size)
        System.arraycopy(iv, 0, out, 0, 12)
        System.arraycopy(ct, 0, out, 12, ct.size)
        return out
    }

    fun decryptChunk(keyBytes: ByteArray, sealedChunk: ByteArray): ByteArray {
        require(sealedChunk.size > 12) { "Corrupt encrypted chunk" }
        val iv = sealedChunk.copyOfRange(0, 12)
        val ct = sealedChunk.copyOfRange(12, sealedChunk.size)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(keyBytes, "AES"), GCMParameterSpec(128, iv))
        return cipher.doFinal(ct)
    }

    private fun toFixed32(value: BigInteger): ByteArray {
        val raw = value.toByteArray()
        return when {
            raw.size == 32 -> raw
            raw.size > 32 -> raw.copyOfRange(raw.size - 32, raw.size)
            else -> ByteArray(32).also { dst ->
                System.arraycopy(raw, 0, dst, 32 - raw.size, raw.size)
            }
        }
    }

    fun generateIdentity(encKeyBytes: ByteArray): IdentityBundle {
        val kpg = KeyPairGenerator.getInstance("EC")
        kpg.initialize(ECGenParameterSpec("secp256r1"), secureRandom)
        val kp = kpg.generateKeyPair()
        val pub = kp.public as ECPublicKey
        val priv = kp.private as ECPrivateKey

        val x = b64UrlNoPad(toFixed32(pub.w.affineX))
        val y = b64UrlNoPad(toFixed32(pub.w.affineY))
        val d = b64UrlNoPad(toFixed32(priv.s))

        val pubJwk = JSONObject()
            .put("kty", "EC")
            .put("crv", "P-256")
            .put("ext", true)
            .put("x", x)
            .put("y", y)
        val privJwk = JSONObject()
            .put("kty", "EC")
            .put("crv", "P-256")
            .put("ext", true)
            .put("key_ops", org.json.JSONArray().put("deriveKey"))
            .put("x", x)
            .put("y", y)
            .put("d", d)

        val vaultRaw = rand(32)
        return IdentityBundle(
            publicKeyJwk = pubJwk.toString(),
            wrappedPrivateKey = encryptJson(encKeyBytes, privJwk),
            wrappedVaultKey = seal(encKeyBytes, vaultRaw),
            privJwkJson = privJwk.toString(),
            vaultRawB64 = b64(vaultRaw)
        )
    }

    fun unwrapPrivateKeyJwk(encKeyBytes: ByteArray, wrappedPrivateBox: JSONObject): String {
        val privObj = decryptJson(encKeyBytes, wrappedPrivateBox)
        return privObj.toString()
    }

    private fun jwkToPublicKey(jwkStr: String): PublicKey {
        val jwk = JSONObject(jwkStr)
        val x = BigInteger(1, unb64Url(jwk.getString("x")))
        val y = BigInteger(1, unb64Url(jwk.getString("y")))
        val kf = KeyFactory.getInstance("EC")
        return kf.generatePublic(ECPublicKeySpec(ECPoint(x, y), ecSpec))
    }

    private fun jwkToPrivateKey(jwkStr: String): PrivateKey {
        val jwk = JSONObject(jwkStr)
        val d = BigInteger(1, unb64Url(jwk.getString("d")))
        val kf = KeyFactory.getInstance("EC")
        return kf.generatePrivate(ECPrivateKeySpec(d, ecSpec))
    }

    private fun deriveEcdhAesKey(myPrivJwk: String, theirPubJwk: String): ByteArray {
        val priv = jwkToPrivateKey(myPrivJwk)
        val pub = jwkToPublicKey(theirPubJwk)
        val ka = KeyAgreement.getInstance("ECDH")
        ka.init(priv)
        ka.doPhase(pub, true)
        val secret = ka.generateSecret()
        return when {
            secret.size == 32 -> secret
            secret.size > 32 -> secret.copyOfRange(0, 32)
            else -> ByteArray(32).also { dst ->
                System.arraycopy(secret, 0, dst, 32 - secret.size, secret.size)
            }
        }
    }

    fun wrapChatKey(
        rawKeyB64: String,
        myPrivJwk: String,
        theirPubJwk: String,
        myUserId: String
    ): JSONObject {
        val pairAes = deriveEcdhAesKey(myPrivJwk, theirPubJwk)
        val box = seal(pairAes, unb64(rawKeyB64))
        box.put("wrapperId", myUserId)
        return box
    }

    fun unwrapChatKey(
        box: JSONObject,
        myPrivJwk: String,
        wrapperPubJwk: String
    ): String {
        val pairAes = deriveEcdhAesKey(myPrivJwk, wrapperPubJwk)
        val rawBytes = open(pairAes, box)
        return b64(rawBytes)
    }
}

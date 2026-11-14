package app.zovio.mobile.nativeapp.data.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiException(val statusCode: Int, message: String) : Exception(message)

class ZovioApiClient(
    private val baseUrlProvider: () -> String,
    private val tokenProvider: () -> String
) {
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(25, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .pingInterval(25, TimeUnit.SECONDS)
        .build()

    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val binMedia = "application/octet-stream".toMediaType()

    private fun fullUrl(path: String): String {
        val base = baseUrlProvider().trimEnd('/')
        return if (path.startsWith("http")) path else "$base$path"
    }

    suspend fun getJson(path: String, withAuth: Boolean = true): Any = withContext(Dispatchers.IO) {
        val rb = Request.Builder().url(fullUrl(path)).get()
        if (withAuth) {
            val tok = tokenProvider()
            if (tok.isNotBlank()) rb.header("Authorization", "Bearer $tok")
        }
        executeJson(rb.build())
    }

    suspend fun getJsonObject(path: String, withAuth: Boolean = true): JSONObject {
        val res = getJson(path, withAuth)
        return res as? JSONObject ?: JSONObject()
    }

    suspend fun getJsonArray(path: String, withAuth: Boolean = true): JSONArray {
        val res = getJson(path, withAuth)
        return res as? JSONArray ?: JSONArray()
    }

    suspend fun postJson(
        path: String,
        body: JSONObject = JSONObject(),
        withAuth: Boolean = true
    ): JSONObject = sendJson("POST", path, body, withAuth)

    suspend fun patchJson(
        path: String,
        body: JSONObject = JSONObject(),
        withAuth: Boolean = true
    ): JSONObject = sendJson("PATCH", path, body, withAuth)

    suspend fun deleteJson(
        path: String,
        body: JSONObject? = null,
        withAuth: Boolean = true
    ): JSONObject = sendJson("DELETE", path, body, withAuth)

    private suspend fun sendJson(
        method: String,
        path: String,
        body: JSONObject?,
        withAuth: Boolean
    ): JSONObject = withContext(Dispatchers.IO) {
        val reqBody = (body?.toString() ?: "{}").toRequestBody(jsonMedia)
        val rb = Request.Builder().url(fullUrl(path)).method(method, reqBody)
        if (withAuth) {
            val tok = tokenProvider()
            if (tok.isNotBlank()) rb.header("Authorization", "Bearer $tok")
        }
        val res = executeJson(rb.build())
        res as? JSONObject ?: JSONObject()
    }

    suspend fun getBytes(path: String): ByteArray = withContext(Dispatchers.IO) {
        val rb = Request.Builder().url(fullUrl(path)).get()
        val tok = tokenProvider()
        if (tok.isNotBlank()) rb.header("Authorization", "Bearer $tok")
        http.newCall(rb.build()).execute().use { resp ->
            val raw = resp.body?.bytes() ?: ByteArray(0)
            if (!resp.isSuccessful) {
                throw ApiException(resp.code, parseErrorMsg(raw, resp.message))
            }
            raw
        }
    }

    suspend fun putBytes(path: String, bytes: ByteArray): JSONObject = withContext(Dispatchers.IO) {
        val rb = Request.Builder()
            .url(fullUrl(path))
            .put(bytes.toRequestBody(binMedia))
        val tok = tokenProvider()
        if (tok.isNotBlank()) rb.header("Authorization", "Bearer $tok")
        val res = executeJson(rb.build())
        res as? JSONObject ?: JSONObject()
    }

    private fun executeJson(req: Request): Any {
        try {
            http.newCall(req).execute().use { resp ->
                val text = resp.body?.string() ?: ""
                if (!resp.isSuccessful) {
                    throw ApiException(resp.code, parseErrorMsg(text.toByteArray(), resp.message))
                }
                val trimmed = text.trim()
                if (trimmed.isEmpty()) return JSONObject()
                return when {
                    trimmed.startsWith("[") -> JSONArray(trimmed)
                    trimmed.startsWith("{") -> JSONObject(trimmed)
                    else -> JSONObject().put("raw", trimmed)
                }
            }
        } catch (e: ApiException) {
            throw e
        } catch (e: IOException) {
            throw ApiException(0, e.message ?: "Network connection error")
        }
    }

    private fun parseErrorMsg(raw: ByteArray, fallback: String): String {
        return try {
            val obj = JSONObject(String(raw, Charsets.UTF_8))
            obj.optString("error", fallback).ifBlank { fallback }
        } catch (_: Exception) {
            fallback.ifBlank { "Request failed" }
        }
    }
}

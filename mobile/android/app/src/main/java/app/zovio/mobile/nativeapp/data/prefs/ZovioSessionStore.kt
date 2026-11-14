package app.zovio.mobile.nativeapp.data.prefs

import android.content.Context
import app.zovio.mobile.ZovioBgSyncService
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONObject

data class ZovioSession(
    val token: String = "",
    val userId: String = "",
    val username: String = "",
    val name: String = "",
    val email: String = "",
    val avatar: String? = null,
    val darkTheme: Boolean = true
) {
    val isLoggedIn: Boolean get() = token.isNotBlank() && userId.isNotBlank()
}

class ZovioSessionStore(private val context: Context) {
    private val bgPrefs = context.getSharedPreferences(ZovioBgSyncService.PREFS_NAME, Context.MODE_PRIVATE)
    private val keyPrefs = context.getSharedPreferences(ZovioBgSyncService.KEYS_PREFS_NAME, Context.MODE_PRIVATE)
    private val uiPrefs = context.getSharedPreferences("zovio_native_ui", Context.MODE_PRIVATE)

    private val _session = MutableStateFlow(loadSession())
    val session: StateFlow<ZovioSession> = _session.asStateFlow()

    val baseHttpUrl: String
        get() {
            val ws = bgPrefs.getString(ZovioBgSyncService.KEY_WS_URL, ZovioBgSyncService.DEFAULT_WS_URL)
                ?: ZovioBgSyncService.DEFAULT_WS_URL
            return ws
                .replace("wss://", "https://")
                .replace("ws://", "http://")
                .trimEnd('/')
        }

    val wsUrl: String
        get() = bgPrefs.getString(ZovioBgSyncService.KEY_WS_URL, ZovioBgSyncService.DEFAULT_WS_URL)
            ?: ZovioBgSyncService.DEFAULT_WS_URL

    private fun loadSession(): ZovioSession {
        return ZovioSession(
            token = bgPrefs.getString(ZovioBgSyncService.KEY_TOKEN, "") ?: "",
            userId = bgPrefs.getString(ZovioBgSyncService.KEY_USER_ID, "") ?: "",
            username = uiPrefs.getString("username", "") ?: "",
            name = uiPrefs.getString("name", "") ?: "",
            email = uiPrefs.getString("email", "") ?: "",
            avatar = uiPrefs.getString("avatar", null),
            darkTheme = uiPrefs.getBoolean("darkTheme", true)
        )
    }

    fun reload() {
        _session.value = loadSession()
    }

    fun saveLogin(token: String, user: JSONObject, privJwkJson: String?) {
        val uid = user.optString("id", "")
        val uname = user.optString("username", "")
        val name = user.optString("name", uname)
        val email = user.optString("email", "")
        val avatar = user.optString("avatar", "").takeIf { it.isNotEmpty() && it != "null" }

        bgPrefs.edit()
            .putString(ZovioBgSyncService.KEY_TOKEN, token)
            .putString(ZovioBgSyncService.KEY_USER_ID, uid)
            .apply()

        uiPrefs.edit()
            .putString("username", uname)
            .putString("name", name)
            .putString("email", email)
            .putString("avatar", avatar)
            .apply()

        if (!privJwkJson.isNullOrBlank() && uid.isNotBlank()) {
            keyPrefs.edit().putString("privJwk_$uid", privJwkJson).apply()
        }

        _session.value = loadSession()
        ZovioBgSyncService.startOrRefresh(context)
    }

    fun updateUser(user: JSONObject) {
        val uid = user.optString("id", _session.value.userId)
        val uname = user.optString("username", _session.value.username)
        val name = user.optString("name", _session.value.name)
        val email = user.optString("email", _session.value.email)
        val avatar = user.optString("avatar", "").takeIf { it.isNotEmpty() && it != "null" }

        bgPrefs.edit().putString(ZovioBgSyncService.KEY_USER_ID, uid).apply()
        uiPrefs.edit()
            .putString("username", uname)
            .putString("name", name)
            .putString("email", email)
            .putString("avatar", avatar)
            .apply()
        _session.value = loadSession()
    }

    fun savePrivateKeyJwk(uid: String, privJwkJson: String) {
        if (uid.isBlank() || privJwkJson.isBlank()) return
        keyPrefs.edit().putString("privJwk_$uid", privJwkJson).apply()
    }

    fun getPrivateKeyJwk(uid: String = _session.value.userId): String? {
        if (uid.isBlank()) return null
        return keyPrefs.getString("privJwk_$uid", null)
    }

    fun saveMyPublicKeyJwk(uid: String, pubJwk: String) {
        if (uid.isBlank() || pubJwk.isBlank()) return
        keyPrefs.edit().putString("pubJwk_$uid", pubJwk).apply()
    }

    fun getMyPublicKeyJwk(uid: String = _session.value.userId): String? {
        if (uid.isBlank()) return null
        return keyPrefs.getString("pubJwk_$uid", null)
    }

    fun getCachedChatKeyB64(chatId: String, keyVersion: Int): String? {
        val savedVer = keyPrefs.getInt("kv_$chatId", 0)
        val keyB64 = keyPrefs.getString("key_$chatId", null)
        return if (!keyB64.isNullOrBlank() && (savedVer == keyVersion || keyVersion <= 1)) keyB64 else null
    }

    fun saveChatKeyB64(
        chatId: String,
        keyB64: String,
        keyVersion: Int,
        title: String,
        isGroup: Boolean
    ) {
        ZovioBgSyncService.saveChatKey(context, chatId, keyB64, keyVersion, title, isGroup)
    }

    fun setDarkTheme(dark: Boolean) {
        uiPrefs.edit().putBoolean("darkTheme", dark).apply()
        _session.value = _session.value.copy(darkTheme = dark)
    }

    fun logout() {
        bgPrefs.edit()
            .remove(ZovioBgSyncService.KEY_TOKEN)
            .remove(ZovioBgSyncService.KEY_USER_ID)
            .apply()
        uiPrefs.edit()
            .remove("username")
            .remove("name")
            .remove("email")
            .remove("avatar")
            .apply()
        ZovioBgSyncService.stop(context)
        _session.value = loadSession()
    }
}

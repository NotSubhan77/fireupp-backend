package app.zovio.mobile

import android.app.PictureInPictureParams
import android.content.Intent
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import android.util.Rational
import com.getcapacitor.BridgeActivity
import org.json.JSONObject

class MainActivity : BridgeActivity() {
    companion object {
        @Volatile
        var isCallActiveForPip: Boolean = false
        @Volatile
        var isSuppressingPipForSystemDialog: Boolean = false
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(ZovioMediaPlugin::class.java)
        super.onCreate(savedInstanceState)

        bridge?.webView?.settings?.apply {
            mediaPlaybackRequiresUserGesture = false
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            databaseEnabled = true
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
        }
        syncSystemPipParams()
        dispatchNotificationIntent(intent)
    }

    fun syncSystemPipParams() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val builder = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(3, 4))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    builder.setAutoEnterEnabled(isCallActiveForPip && !isSuppressingPipForSystemDialog)
                }
                setPictureInPictureParams(builder.build())
            } catch (_: Exception) {}
        }
    }

    fun exitPipIfActive() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode) {
            try { moveTaskToBack(false) } catch (_: Exception) {}
        }
    }

    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            isCallActiveForPip &&
            !isSuppressingPipForSystemDialog &&
            !isInPictureInPictureMode
        ) {
            try {
                val builder = PictureInPictureParams.Builder()
                    .setAspectRatio(Rational(3, 4))
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    builder.setAutoEnterEnabled(true)
                }
                enterPictureInPictureMode(builder.build())
            } catch (_: Exception) {}
        }
    }

    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        bridge?.webView?.post {
            bridge?.webView?.evaluateJavascript(
                "window.__zovioAndroidPipChanged && window.__zovioAndroidPipChanged(${if (isInPictureInPictureMode) "true" else "false"});",
                null
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        dispatchNotificationIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        ZovioBgSyncService.isAppInForeground = true
        ZovioBgSyncService.cancelNotificationByTag(this, "call-incoming")
        ZovioBgSyncService.startOrRefresh(this)
        syncSystemPipParams()
        bridge?.webView?.post {
            bridge?.webView?.evaluateJavascript(
                "window.__zovioAndroidAppState && window.__zovioAndroidAppState(true);",
                null
            )
        }
    }

    override fun onPause() {
        val enteringPip = Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && isInPictureInPictureMode
        ZovioBgSyncService.isAppInForeground = enteringPip
        if (!enteringPip) {
            ZovioBgSyncService.startOrRefresh(this)
            bridge?.webView?.post {
                bridge?.webView?.evaluateJavascript(
                    "window.__zovioAndroidAppState && window.__zovioAndroidAppState(false);",
                    null
                )
            }
        }
        super.onPause()
    }

    private fun dispatchNotificationIntent(intent: Intent?) {
        val routeView = intent?.getStringExtra("routeView")?.trim() ?: ""
        val callMode = intent?.getStringExtra("callMode")?.trim() ?: ""
        val chatIdExtra = intent?.getStringExtra("chatId")?.trim() ?: ""
        if (routeView.isNotEmpty()) {
            val detail = JSONObject()
                .put("routeView", routeView)
                .put("chatId", chatIdExtra)
                .put("callMode", callMode)
                .toString()
            bridge?.webView?.postDelayed({
                bridge?.webView?.evaluateJavascript(
                    "try{window.dispatchEvent(new CustomEvent('zovio:native-route',{detail:$detail}));}catch(e){}",
                    null
                )
            }, 650L)
            return
        }
        val incomingCallRaw = intent?.getStringExtra("incomingCallJson")?.trim() ?: ""
        if (incomingCallRaw.isNotEmpty()) {
            val quotedCall = JSONObject.quote(incomingCallRaw)
            bridge?.webView?.postDelayed({
                bridge?.webView?.evaluateJavascript(
                    "try{var _c=JSON.parse($quotedCall);window.__zovioPendingCall=_c;window.dispatchEvent(new CustomEvent('zovio:incoming-call',{detail:_c}));}catch(e){}",
                    null
                )
            }, 350L)
        }
        val chatId = chatIdExtra
        if (chatId.isEmpty()) return
        val quoted = JSONObject.quote(chatId)
        bridge?.webView?.postDelayed({
            bridge?.webView?.evaluateJavascript(
                "window.__zovioPendingChatId=$quoted;window.dispatchEvent(new CustomEvent('zovio:open-chat',{detail:{chatId:$quoted}}));",
                null
            )
        }, 350L)
    }
}

package app.zovio.mobile

import android.content.Intent
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import org.json.JSONObject

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(ZovioMediaPlugin::class.java)
        super.onCreate(savedInstanceState)

        bridge?.webView?.settings?.apply {
            mediaPlaybackRequiresUserGesture = false
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            databaseEnabled = true
        }
        dispatchNotificationIntent(intent)
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
        bridge?.webView?.post {
            bridge?.webView?.evaluateJavascript(
                "window.__zovioAndroidAppState && window.__zovioAndroidAppState(true);",
                null
            )
        }
    }

    override fun onPause() {
        ZovioBgSyncService.isAppInForeground = false
        ZovioBgSyncService.startOrRefresh(this)
        bridge?.webView?.post {
            bridge?.webView?.evaluateJavascript(
                "window.__zovioAndroidAppState && window.__zovioAndroidAppState(false);",
                null
            )
        }
        super.onPause()
    }

    private fun dispatchNotificationIntent(intent: Intent?) {
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
        val chatId = intent?.getStringExtra("chatId")?.trim() ?: return
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

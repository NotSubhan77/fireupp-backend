package app.zovio.mobile

import android.os.Bundle
import com.getcapacitor.BridgeActivity

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
    }
}

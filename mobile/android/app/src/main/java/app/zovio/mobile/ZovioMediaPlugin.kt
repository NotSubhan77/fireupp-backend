package app.zovio.mobile

import android.Manifest
import android.app.Activity
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.Looper
import android.util.Base64
import androidx.activity.result.ActivityResult
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.nio.ByteBuffer

@CapacitorPlugin(
    name = "ZovioMedia",
    permissions = [
        Permission(strings = [Manifest.permission.RECORD_AUDIO], alias = "audio"),
        Permission(strings = [Manifest.permission.CAMERA], alias = "camera"),
        Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications"),
        Permission(strings = [Manifest.permission.BLUETOOTH_CONNECT], alias = "bluetooth"),
        Permission(
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ],
            alias = "location"
        )
    ]
)
class ZovioMediaPlugin : Plugin() {

    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private var projectionThread: HandlerThread? = null
    private var projectionHandler: Handler? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private var shareWidth = 720
    private var shareHeight = 1280
    private var shareFps = 20
    private var lastFrameMs = 0L
    @Volatile
    private var preferredAudioRoute: String = ""

    @PluginMethod
    fun ensurePermissions(call: PluginCall) {
        val needCamera = call.getBoolean("video", false) ?: false
        val missingAliases = mutableListOf<String>()
        if (getPermissionState("audio") != PermissionState.GRANTED) {
            missingAliases.add("audio")
        }
        if (needCamera && getPermissionState("camera") != PermissionState.GRANTED) {
            missingAliases.add("camera")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            missingAliases.add("notifications")
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            getPermissionState("bluetooth") != PermissionState.GRANTED
        ) {
            missingAliases.add("bluetooth")
        }
        if (missingAliases.isEmpty()) {
            call.resolve(JSObject().put("granted", true))
            return
        }
        requestPermissionForAliases(missingAliases.toTypedArray(), call, "onMediaPermissionsResult")
    }

    @PermissionCallback
    private fun onMediaPermissionsResult(call: PluginCall) {
        val audioOk = getPermissionState("audio") == PermissionState.GRANTED
        val needCamera = call.getBoolean("video", false) ?: false
        val camOk = !needCamera || getPermissionState("camera") == PermissionState.GRANTED
        call.resolve(JSObject().put("granted", audioOk && camOk))
    }

    @PluginMethod
    fun startCallService(call: PluginCall) {
        MainActivity.isCallActiveForPip = true
        mainHandler.post { (activity as? MainActivity)?.syncSystemPipParams() }
        val intent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_START_CALL
            putExtra(ZovioCallService.EXTRA_TITLE, call.getString("title", "Zovio Call"))
            putExtra(ZovioCallService.EXTRA_VIDEO, call.getBoolean("video", false) ?: false)
        }
        ContextCompat.startForegroundService(context, intent)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun stopCallService(call: PluginCall) {
        MainActivity.isCallActiveForPip = false
        MainActivity.isSuppressingPipForSystemDialog = false
        preferredAudioRoute = ""
        mainHandler.post {
            val act = activity as? MainActivity
            act?.syncSystemPipParams()
            act?.exitPipIfActive()
        }
        stopProjectionInternal()
        val intent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_STOP_CALL
        }
        context.startService(intent)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun setCallPipAllowed(call: PluginCall) {
        val allowed = call.getBoolean("allowed", false) ?: false
        MainActivity.isCallActiveForPip = allowed
        mainHandler.post {
            val act = activity as? MainActivity
            act?.syncSystemPipParams()
            if (!allowed) act?.exitPipIfActive()
        }
        call.resolve(JSObject().put("ok", true))
    }

    private fun applyAudioRouteInternal(am: AudioManager, route: String): String {
        val norm = when (route.lowercase()) {
            "bluetooth", "bt" -> "bluetooth"
            "wired", "headset", "headphones" -> "wired"
            "earpiece", "phone" -> "earpiece"
            else -> "speaker"
        }
        preferredAudioRoute = norm
        try { am.mode = AudioManager.MODE_IN_COMMUNICATION } catch (_: Exception) {}

        var routed = false
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                val commDevs = am.availableCommunicationDevices
                val target: AudioDeviceInfo? = when (norm) {
                    "bluetooth" -> commDevs.firstOrNull {
                        it.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO ||
                            it.type == AudioDeviceInfo.TYPE_BLE_HEADSET ||
                            it.type == AudioDeviceInfo.TYPE_BLE_SPEAKER ||
                            it.type == AudioDeviceInfo.TYPE_HEARING_AID
                    } ?: commDevs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP }
                    "wired" -> commDevs.firstOrNull {
                        it.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                            it.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                            it.type == AudioDeviceInfo.TYPE_USB_HEADSET ||
                            it.type == AudioDeviceInfo.TYPE_USB_DEVICE
                    }
                    "earpiece" -> commDevs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_EARPIECE }
                    else -> commDevs.firstOrNull { it.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER }
                }
                if (target != null) {
                    routed = am.setCommunicationDevice(target)
                }
            } catch (_: Exception) {}
        }

        when (norm) {
            "bluetooth" -> {
                try { am.isSpeakerphoneOn = false } catch (_: Exception) {}
                if (!routed || Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
                    try {
                        @Suppress("DEPRECATION")
                        am.startBluetoothSco()
                        @Suppress("DEPRECATION")
                        am.isBluetoothScoOn = true
                    } catch (_: Exception) {}
                }
            }
            "speaker" -> {
                try {
                    @Suppress("DEPRECATION")
                    if (am.isBluetoothScoOn) {
                        am.stopBluetoothSco()
                        am.isBluetoothScoOn = false
                    }
                } catch (_: Exception) {}
                try { am.isSpeakerphoneOn = true } catch (_: Exception) {}
            }
            else -> {
                try {
                    @Suppress("DEPRECATION")
                    if (am.isBluetoothScoOn) {
                        am.stopBluetoothSco()
                        am.isBluetoothScoOn = false
                    }
                } catch (_: Exception) {}
                try { am.isSpeakerphoneOn = false } catch (_: Exception) {}
            }
        }
        return norm
    }

    @PluginMethod
    fun setAudioRoute(call: PluginCall) {
        val route = call.getString("route", "speaker") ?: "speaker"
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val active = applyAudioRouteInternal(am, route)
        call.resolve(
            JSObject()
                .put("activeRoute", active)
                .put("speaker", active == "speaker")
        )
    }

    @PluginMethod
    fun setSpeakerphone(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        val active = applyAudioRouteInternal(am, if (enabled) "speaker" else "earpiece")
        call.resolve(
            JSObject()
                .put("speaker", active == "speaker")
                .put("activeRoute", active)
        )
    }

    @PluginMethod
    fun getAudioRoutes(call: PluginCall) {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        var hasBluetooth = false
        var bluetoothName = ""
        var hasHeadset = false
        var headsetName = ""
        val modelName = (Build.MODEL ?: "").trim()

        val inspectDevice: (AudioDeviceInfo) -> Unit = { d ->
            val pName = d.productName?.toString()?.trim() ?: ""
            val cleanName = if (pName.isNotEmpty() && !pName.equals(modelName, ignoreCase = true)) pName else ""
            when (d.type) {
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
                AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
                AudioDeviceInfo.TYPE_BLE_HEADSET,
                AudioDeviceInfo.TYPE_BLE_SPEAKER,
                AudioDeviceInfo.TYPE_HEARING_AID -> {
                    hasBluetooth = true
                    if (bluetoothName.isEmpty() && cleanName.isNotEmpty()) {
                        bluetoothName = cleanName
                    }
                }
                AudioDeviceInfo.TYPE_WIRED_HEADSET,
                AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
                AudioDeviceInfo.TYPE_USB_HEADSET,
                AudioDeviceInfo.TYPE_USB_DEVICE -> {
                    hasHeadset = true
                    if (headsetName.isEmpty() && cleanName.isNotEmpty()) {
                        headsetName = cleanName
                    }
                }
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                am.availableCommunicationDevices.forEach(inspectDevice)
            } catch (_: Exception) {}
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                am.getDevices(AudioManager.GET_DEVICES_OUTPUTS).forEach(inspectDevice)
                am.getDevices(AudioManager.GET_DEVICES_INPUTS).forEach(inspectDevice)
            } catch (_: Exception) {}
        }
        @Suppress("DEPRECATION")
        if (!hasBluetooth && (am.isBluetoothScoOn || am.isBluetoothA2dpOn)) {
            hasBluetooth = true
        }

        var activeRoute = ""
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                when (am.communicationDevice?.type) {
                    AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
                    AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
                    AudioDeviceInfo.TYPE_BLE_HEADSET,
                    AudioDeviceInfo.TYPE_BLE_SPEAKER,
                    AudioDeviceInfo.TYPE_HEARING_AID -> activeRoute = "bluetooth"
                    AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> activeRoute = "speaker"
                    AudioDeviceInfo.TYPE_WIRED_HEADSET,
                    AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
                    AudioDeviceInfo.TYPE_USB_HEADSET,
                    AudioDeviceInfo.TYPE_USB_DEVICE -> activeRoute = "wired"
                    AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> activeRoute = "earpiece"
                }
            } catch (_: Exception) {}
        }
        if (activeRoute.isEmpty()) {
            @Suppress("DEPRECATION")
            activeRoute = when {
                preferredAudioRoute == "bluetooth" && hasBluetooth -> "bluetooth"
                am.isBluetoothScoOn && hasBluetooth -> "bluetooth"
                am.isSpeakerphoneOn -> "speaker"
                preferredAudioRoute == "wired" && hasHeadset -> "wired"
                hasHeadset && !am.isSpeakerphoneOn -> "wired"
                else -> "earpiece"
            }
        }

        call.resolve(
            JSObject()
                .put("speaker", am.isSpeakerphoneOn)
                .put("speakerOn", am.isSpeakerphoneOn)
                .put("activeRoute", activeRoute)
                .put("hasBluetooth", hasBluetooth)
                .put("bluetoothName", bluetoothName.ifEmpty { "Bluetooth Headphones" })
                .put("hasHeadset", hasHeadset)
                .put("headsetName", headsetName.ifEmpty { "Wired Headphones" })
        )
    }

    @PluginMethod
    fun requestNotificationPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            getPermissionState("notifications") != PermissionState.GRANTED
        ) {
            requestPermissionForAlias("notifications", call, "onNotifPermissionResult")
            return
        }
        call.resolve(JSObject().put("granted", true))
    }

    @PermissionCallback
    private fun onNotifPermissionResult(call: PluginCall) {
        val granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
            getPermissionState("notifications") == PermissionState.GRANTED
        call.resolve(JSObject().put("granted", granted))
    }

    @Volatile
    private var isStartingProjection = false

    private var watchLocationListener: android.location.LocationListener? = null

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    private fun locationToJs(loc: android.location.Location): JSObject {
        return JSObject()
            .put("ok", true)
            .put("lat", loc.latitude)
            .put("lng", loc.longitude)
            .put("accuracy", loc.accuracy.toDouble())
            .put("provider", loc.provider ?: "native")
            .put("ts", loc.time)
    }

    private fun getBestLastKnownLocation(lm: android.location.LocationManager): android.location.Location? {
        val providers = mutableListOf(
            android.location.LocationManager.GPS_PROVIDER,
            android.location.LocationManager.NETWORK_PROVIDER,
            android.location.LocationManager.PASSIVE_PROVIDER
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            providers.add(0, android.location.LocationManager.FUSED_PROVIDER)
        }
        var best: android.location.Location? = null
        for (p in providers) {
            try {
                if (!lm.isProviderEnabled(p)) continue
                @Suppress("MissingPermission")
                val loc = lm.getLastKnownLocation(p) ?: continue
                if (best == null || loc.time > best.time || (loc.accuracy < best.accuracy && (best.time - loc.time) < 30_000L)) {
                    best = loc
                }
            } catch (_: Exception) {}
        }
        return best
    }

    @PluginMethod
    fun getAudioRingerState(call: PluginCall) {
        val silentOrDnd = ZovioBgSyncService.isDndOrMuted(context)
        val nm = context.getSystemService(android.app.NotificationManager::class.java)
        val filter = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && nm != null) {
            nm.currentInterruptionFilter
        } else {
            1
        }
        val am = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        val ringerMode = am?.ringerMode ?: AudioManager.RINGER_MODE_NORMAL
        val ringerMuted = ringerMode != AudioManager.RINGER_MODE_NORMAL
        val dndActive = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            filter != android.app.NotificationManager.INTERRUPTION_FILTER_ALL &&
            filter != android.app.NotificationManager.INTERRUPTION_FILTER_UNKNOWN
        val hardDnd = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
            filter == android.app.NotificationManager.INTERRUPTION_FILTER_NONE
        call.resolve(
            JSObject()
                .put("dnd", dndActive)
                .put("hardDnd", hardDnd)
                .put("ringerMuted", ringerMuted)
                .put("interruptionFilter", filter)
                .put("ringerMode", ringerMode)
                .put("silentOrDnd", silentOrDnd)
        )
    }

    private fun getSharedCacheDir(): java.io.File {
        val dir = java.io.File(context.cacheDir, "shared")
        if (!dir.exists()) dir.mkdirs()
        // Clean up temporary shared files older than 2 hours
        val cutoff = System.currentTimeMillis() - 7_200_000L
        dir.listFiles()?.forEach { f ->
            if (f.lastModified() < cutoff) {
                try { f.delete() } catch (_: Exception) {}
            }
        }
        return dir
    }

    private fun sanitizeShareFileName(name: String): String {
        val cleaned = name.replace(Regex("[\\\\/:*?\"<>|\\s]+"), "_").trim('_')
        return if (cleaned.isEmpty()) "zovio_file_${System.currentTimeMillis()}" else cleaned.take(96)
    }

    @PluginMethod
    fun shareBegin(call: PluginCall) {
        val rawName = call.getString("fileName", "zovio_file") ?: "zovio_file"
        val safeName = "${System.currentTimeMillis()}_${sanitizeShareFileName(rawName)}"
        try {
            val f = java.io.File(getSharedCacheDir(), safeName)
            if (f.exists()) f.delete()
            f.createNewFile()
            call.resolve(JSObject().put("ok", true).put("token", safeName))
        } catch (e: Exception) {
            call.resolve(JSObject().put("ok", false).put("error", e.message ?: "Failed to create share file"))
        }
    }

    @PluginMethod
    fun shareAppend(call: PluginCall) {
        val token = call.getString("token", "") ?: ""
        val dataB64 = call.getString("dataB64", "") ?: ""
        if (token.isEmpty() || token.contains("..") || token.contains('/') || token.contains('\\')) {
            call.resolve(JSObject().put("ok", false).put("error", "Invalid share token"))
            return
        }
        try {
            val f = java.io.File(getSharedCacheDir(), token)
            val bytes = Base64.decode(dataB64, Base64.DEFAULT)
            java.io.FileOutputStream(f, true).use { fos -> fos.write(bytes) }
            call.resolve(JSObject().put("ok", true))
        } catch (e: Exception) {
            call.resolve(JSObject().put("ok", false).put("error", e.message ?: "Failed writing share chunk"))
        }
    }

    @PluginMethod
    fun shareCommit(call: PluginCall) {
        val token = call.getString("token", "") ?: ""
        val mime = (call.getString("mime", "*/*") ?: "*/*").ifEmpty { "*/*" }
        val text = call.getString("text", "") ?: ""
        val title = call.getString("title", "Share via Zovio") ?: "Share via Zovio"
        if (token.isEmpty() || token.contains("..") || token.contains('/') || token.contains('\\')) {
            call.resolve(JSObject().put("ok", false).put("error", "Invalid share token"))
            return
        }
        try {
            val f = java.io.File(getSharedCacheDir(), token)
            val uri = androidx.core.content.FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                f
            )
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = mime
                putExtra(Intent.EXTRA_STREAM, uri)
                if (text.isNotEmpty()) putExtra(Intent.EXTRA_TEXT, text)
                clipData = android.content.ClipData.newRawUri(title, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            val chooser = Intent.createChooser(sendIntent, title).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            mainHandler.post {
                try {
                    (activity ?: context).startActivity(chooser)
                } catch (_: Exception) {}
            }
            call.resolve(JSObject().put("ok", true))
        } catch (e: Exception) {
            call.resolve(JSObject().put("ok", false).put("error", e.message ?: "Share failed"))
        }
    }

    @PluginMethod
    fun shareText(call: PluginCall) {
        val text = call.getString("text", "") ?: ""
        val title = call.getString("title", "Share via Zovio") ?: "Share via Zovio"
        if (text.isEmpty()) {
            call.resolve(JSObject().put("ok", false))
            return
        }
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, text)
        }
        val chooser = Intent.createChooser(sendIntent, title).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        mainHandler.post {
            try {
                (activity ?: context).startActivity(chooser)
            } catch (_: Exception) {}
        }
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun syncChatKey(call: PluginCall) {
        val chatId = call.getString("chatId", "") ?: ""
        val keyB64 = call.getString("keyB64", "") ?: ""
        val keyVersion = call.getInt("keyVersion", 1) ?: 1
        val chatTitle = call.getString("chatTitle", "") ?: ""
        val isGroup = call.getBoolean("isGroup", false) ?: false
        if (chatId.isNotEmpty() && keyB64.isNotEmpty()) {
            ZovioBgSyncService.saveChatKey(context, chatId, keyB64, keyVersion, chatTitle, isGroup)
        }
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun getCurrentLocation(call: PluginCall) {
        if (!hasLocationPermission()) {
            requestPermissionForAlias("location", call, "onCurrentLocationPerms")
            return
        }
        fetchCurrentLocationInternal(call)
    }

    @PermissionCallback
    private fun onCurrentLocationPerms(call: PluginCall) {
        if (!hasLocationPermission()) {
            call.resolve(JSObject().put("ok", false).put("error", "Location permission denied"))
            return
        }
        fetchCurrentLocationInternal(call)
    }

    @Suppress("MissingPermission")
    private fun fetchCurrentLocationInternal(call: PluginCall) {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
        if (lm == null) {
            call.resolve(JSObject().put("ok", false).put("error", "Location service unavailable"))
            return
        }

        val lastKnown = getBestLastKnownLocation(lm)
        val now = System.currentTimeMillis()
        if (lastKnown != null && (now - lastKnown.time) < 20_000L && lastKnown.accuracy <= 100f) {
            call.resolve(locationToJs(lastKnown))
            return
        }

        val providers = mutableListOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try { if (lm.isProviderEnabled(android.location.LocationManager.FUSED_PROVIDER)) providers.add(android.location.LocationManager.FUSED_PROVIDER) } catch (_: Exception) {}
        }
        try { if (lm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER)) providers.add(android.location.LocationManager.GPS_PROVIDER) } catch (_: Exception) {}
        try { if (lm.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER)) providers.add(android.location.LocationManager.NETWORK_PROVIDER) } catch (_: Exception) {}

        if (providers.isEmpty()) {
            if (lastKnown != null) {
                call.resolve(locationToJs(lastKnown))
            } else {
                call.resolve(JSObject().put("ok", false).put("error", "Enable device GPS/Location to share coordinates"))
            }
            return
        }

        val timeoutMs = (call.getInt("timeoutMs", 8500) ?: 8500).toLong().coerceIn(2000L, 15000L)
        var resolved = false
        var bestFix = lastKnown

        lateinit var listener: android.location.LocationListener
        val finish = {
            if (!resolved) {
                resolved = true
                try { lm.removeUpdates(listener) } catch (_: Exception) {}
                val finalLoc = bestFix
                if (finalLoc != null) {
                    call.resolve(locationToJs(finalLoc))
                } else {
                    call.resolve(JSObject().put("ok", false).put("error", "Could not acquire GPS fix in time"))
                }
            }
        }

        val timeoutRunnable = Runnable { finish() }
        listener = object : android.location.LocationListener {
            override fun onLocationChanged(location: android.location.Location) {
                if (bestFix == null || location.accuracy <= (bestFix?.accuracy ?: Float.MAX_VALUE) || location.time > (bestFix?.time ?: 0L)) {
                    bestFix = location
                }
                if (location.accuracy <= 65f || providers.size == 1) {
                    mainHandler.removeCallbacks(timeoutRunnable)
                    finish()
                }
            }
            override fun onProviderDisabled(provider: String) {}
            override fun onProviderEnabled(provider: String) {}
            @Deprecated("Deprecated in Android")
            override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
        }

        mainHandler.postDelayed(timeoutRunnable, timeoutMs)
        for (p in providers) {
            try {
                lm.requestLocationUpdates(p, 500L, 0f, listener, android.os.Looper.getMainLooper())
            } catch (_: Exception) {}
        }
    }

    @PluginMethod
    fun startLocationWatch(call: PluginCall) {
        if (!hasLocationPermission()) {
            requestPermissionForAlias("location", call, "onWatchLocationPerms")
            return
        }
        startLocationWatchInternal(call)
    }

    @PermissionCallback
    private fun onWatchLocationPerms(call: PluginCall) {
        if (!hasLocationPermission()) {
            call.resolve(JSObject().put("ok", false).put("error", "Location permission denied"))
            return
        }
        startLocationWatchInternal(call)
    }

    @Suppress("MissingPermission")
    private fun startLocationWatchInternal(call: PluginCall) {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
        if (lm == null) {
            call.resolve(JSObject().put("ok", false).put("error", "Location service unavailable"))
            return
        }
        stopLocationWatchInternal(lm)

        val listener = object : android.location.LocationListener {
            override fun onLocationChanged(location: android.location.Location) {
                notifyListeners("locationUpdate", locationToJs(location))
            }
            override fun onProviderDisabled(provider: String) {}
            override fun onProviderEnabled(provider: String) {}
            @Deprecated("Deprecated in Android")
            override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) {}
        }
        watchLocationListener = listener

        val providers = listOf(
            android.location.LocationManager.GPS_PROVIDER,
            android.location.LocationManager.NETWORK_PROVIDER
        )
        var attached = 0
        for (p in providers) {
            try {
                if (lm.isProviderEnabled(p)) {
                    lm.requestLocationUpdates(p, 3000L, 2f, listener, android.os.Looper.getMainLooper())
                    attached++
                }
            } catch (_: Exception) {}
        }

        val last = getBestLastKnownLocation(lm)
        if (last != null) {
            notifyListeners("locationUpdate", locationToJs(last))
        }
        call.resolve(JSObject().put("ok", attached > 0 || last != null))
    }

    @PluginMethod
    fun stopLocationWatch(call: PluginCall) {
        val lm = context.getSystemService(Context.LOCATION_SERVICE) as? android.location.LocationManager
        if (lm != null) stopLocationWatchInternal(lm)
        call.resolve(JSObject().put("ok", true))
    }

    @Suppress("MissingPermission")
    private fun stopLocationWatchInternal(lm: android.location.LocationManager) {
        watchLocationListener?.let { l ->
            try { lm.removeUpdates(l) } catch (_: Exception) {}
        }
        watchLocationListener = null
    }

    @PluginMethod
    fun showNotification(call: PluginCall) {
        val title = call.getString("title", "Zovio") ?: "Zovio"
        val body = call.getString("body", "") ?: ""
        val chatId = call.getString("chatId", "") ?: ""
        val tag = call.getString("tag", chatId.ifEmpty { "zovio" }) ?: "zovio"
        val category = call.getString("category", "") ?: ""
        val silent = call.getBoolean("silent", false) ?: false
        val incomingCallJson = call.getString("incomingCallJson", "") ?: ""
        val senderName = call.getString("senderName", "") ?: ""
        val chatName = call.getString("chatName", "") ?: ""
        val isGroup = call.getBoolean("isGroup", false) ?: false

        val shown = ZovioBgSyncService.showSystemNotification(
            context = context,
            title = title,
            body = body,
            chatId = chatId,
            tag = tag,
            category = category,
            silent = silent,
            incomingCallJson = incomingCallJson,
            senderName = senderName,
            chatName = chatName,
            isGroup = isGroup
        )
        call.resolve(JSObject().put("shown", shown))
    }

    @PluginMethod
    fun consumePendingIntents(call: PluginCall) {
        val incoming = MainActivity.pendingIncomingCallJson
        val action = MainActivity.pendingCallAction
        val chatId = MainActivity.pendingChatId
        val shareJson = MainActivity.pendingShareJson
        MainActivity.pendingIncomingCallJson = ""
        MainActivity.pendingCallAction = ""
        MainActivity.pendingChatId = ""
        MainActivity.pendingShareJson = ""
        call.resolve(
            JSObject()
                .put("incomingCallJson", incoming)
                .put("callAction", action)
                .put("chatId", chatId)
                .put("shareJson", shareJson)
        )
    }

    @PluginMethod
    fun consumePendingShare(call: PluginCall) {
        val shareJson = MainActivity.pendingShareJson
        MainActivity.pendingShareJson = ""
        call.resolve(JSObject().put("shareJson", shareJson))
    }

    @PluginMethod
    fun readPendingShareFile(call: PluginCall) {
        val relName = call.getString("cachePath", "")?.trim() ?: ""
        if (relName.isEmpty() || relName.contains("..") || relName.contains("/") || relName.contains("\\")) {
            call.resolve(JSObject().put("ok", false).put("error", "Invalid cachePath"))
            return
        }
        try {
            val shareDir = File(context.cacheDir, "shared_incoming")
            val target = File(shareDir, relName)
            if (!target.exists() || !target.canonicalPath.startsWith(shareDir.canonicalPath)) {
                call.resolve(JSObject().put("ok", false).put("error", "File not found"))
                return
            }
            if (target.length() > 35L * 1024L * 1024L) {
                call.resolve(JSObject().put("ok", false).put("error", "Shared file exceeds 35 MB limit"))
                return
            }
            val bytes = target.readBytes()
            val b64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
            val name = target.name.replaceFirst(Regex("^\\d+_\\d+_"), "")
            try { target.delete() } catch (_: Exception) {}
            call.resolve(
                JSObject()
                    .put("ok", true)
                    .put("name", name)
                    .put("size", bytes.size)
                    .put("base64", b64)
            )
        } catch (e: Exception) {
            call.resolve(JSObject().put("ok", false).put("error", e.message ?: "Read failed"))
        }
    }

    @PluginMethod
    fun cancelNotification(call: PluginCall) {
        val tag = call.getString("tag", "") ?: ""
        if (tag.isNotEmpty()) {
            ZovioBgSyncService.cancelNotificationByTag(context, tag)
        }
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun setAuthSession(call: PluginCall) {
        val uid = call.getString("userId", "") ?: ""
        val prefs = context.getSharedPreferences(ZovioBgSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putString(ZovioBgSyncService.KEY_TOKEN, call.getString("token", "") ?: "")
            .putString(ZovioBgSyncService.KEY_USER_ID, uid)
            .putString(ZovioBgSyncService.KEY_DEVICE_ID, call.getString("deviceId", "") ?: "")
            .putString(ZovioBgSyncService.KEY_DEVICE_LABEL, call.getString("deviceLabel", "Android Phone") ?: "Android Phone")
            .putString(ZovioBgSyncService.KEY_WS_URL, call.getString("wsUrl", ZovioBgSyncService.DEFAULT_WS_URL) ?: ZovioBgSyncService.DEFAULT_WS_URL)
            .putBoolean(ZovioBgSyncService.KEY_NOTIFY_ENABLED, call.getBoolean("notifyEnabled", true) ?: true)
            .putBoolean(ZovioBgSyncService.KEY_NOTIFY_CALLS, call.getBoolean("notifyCalls", true) ?: true)
            .putBoolean(ZovioBgSyncService.KEY_NOTIFY_DMS, call.getBoolean("notifyDms", true) ?: true)
            .putBoolean(ZovioBgSyncService.KEY_NOTIFY_GROUPS, call.getBoolean("notifyGroups", true) ?: true)
            .putBoolean(ZovioBgSyncService.KEY_NOTIFY_PREVIEW, call.getBoolean("notifyPreview", true) ?: true)
            .apply()

        if (uid.isNotEmpty()) {
            val privJwk = call.getString("privJwk", "") ?: ""
            val pubJwk = call.getString("publicKey", "") ?: ""
            val keyEd = context.getSharedPreferences(ZovioBgSyncService.KEYS_PREFS_NAME, Context.MODE_PRIVATE).edit()
            if (privJwk.isNotEmpty()) keyEd.putString("privJwk_$uid", privJwk)
            if (pubJwk.isNotEmpty()) keyEd.putString("pubJwk_$uid", pubJwk)
            keyEd.apply()

            val uiEd = context.getSharedPreferences("zovio_native_ui", Context.MODE_PRIVATE).edit()
            call.getString("username")?.let { if (it.isNotEmpty()) uiEd.putString("username", it) }
            call.getString("name")?.let { if (it.isNotEmpty()) uiEd.putString("name", it) }
            call.getString("email")?.let { if (it.isNotEmpty()) uiEd.putString("email", it) }
            call.getString("avatar")?.let { if (it.isNotEmpty() && it != "null") uiEd.putString("avatar", it) }
            uiEd.apply()
        }

        ZovioBgSyncService.startOrRefresh(context)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun clearAuthSession(call: PluginCall) {
        val prefs = context.getSharedPreferences(ZovioBgSyncService.PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
        ZovioBgSyncService.stop(context)
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun startScreenShare(call: PluginCall) {
        if (isStartingProjection) {
            call.resolve(JSObject().put("ok", false).put("busy", true).put("error", "Screen capture is already starting"))
            return
        }
        isStartingProjection = true

        val reqW = (call.getInt("maxWidth", 720) ?: 720).coerceIn(360, 1280)
        val reqH = (call.getInt("maxHeight", 1280) ?: 1280).coerceIn(480, 1280)
        val reqFps = (call.getInt("fps", 20) ?: 20).coerceIn(8, 30)

        val metrics = context.resources.displayMetrics
        val aspect = metrics.heightPixels.toFloat() / metrics.widthPixels.coerceAtLeast(1).toFloat()
        shareWidth = reqW
        shareHeight = (reqW * aspect).toInt().coerceIn(480, reqH)
        shareFps = reqFps

        MainActivity.isSuppressingPipForSystemDialog = true
        mainHandler.post { (activity as? MainActivity)?.syncSystemPipParams() }

        try {
            val mgr = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            val intent = mgr.createScreenCaptureIntent()
            startActivityForResult(call, intent, "onScreenCaptureResult")
        } catch (e: Exception) {
            isStartingProjection = false
            MainActivity.isSuppressingPipForSystemDialog = false
            mainHandler.post { (activity as? MainActivity)?.syncSystemPipParams() }
            call.resolve(JSObject().put("ok", false).put("error", e.message ?: "Screen capture failed"))
        }
    }

    @ActivityCallback
    private fun onScreenCaptureResult(call: PluginCall?, result: ActivityResult) {
        MainActivity.isSuppressingPipForSystemDialog = false
        mainHandler.post { (activity as? MainActivity)?.syncSystemPipParams() }
        if (call == null) {
            isStartingProjection = false
            return
        }
        if (result.resultCode != Activity.RESULT_OK || result.data == null) {
            isStartingProjection = false
            call.resolve(JSObject().put("ok", false).put("error", "Screen capture permission denied"))
            return
        }

        // Android 14+ requires starting foreground service with mediaProjection type BEFORE getMediaProjection
        val fgIntent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_ENABLE_SCREEN_SHARE
            putExtra(ZovioCallService.EXTRA_TITLE, "Zovio Screen Share")
            putExtra(ZovioCallService.EXTRA_SCREEN_SHARE, true)
        }
        ContextCompat.startForegroundService(context, fgIntent)

        mainHandler.postDelayed({
            try {
                stopProjectionInternal()
                val mgr = context.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                mediaProjection = mgr.getMediaProjection(result.resultCode, result.data!!)
                if (mediaProjection == null) {
                    call.resolve(JSObject().put("ok", false).put("error", "MediaProjection initialization failed"))
                    return@postDelayed
                }

                projectionThread = HandlerThread("ZovioScreenProjection").apply { start() }
                projectionHandler = Handler(projectionThread!!.looper)

                mediaProjection?.registerCallback(object : MediaProjection.Callback() {
                    override fun onStop() {
                        stopProjectionInternal()
                        mainHandler.post {
                            bridge?.webView?.evaluateJavascript(
                                "window.__zovioScreenShareStopped && window.__zovioScreenShareStopped();",
                                null
                            )
                        }
                    }
                }, projectionHandler)

                imageReader = ImageReader.newInstance(shareWidth, shareHeight, PixelFormat.RGBA_8888, 2)
                val minFrameIntervalMs = (1000L / shareFps).coerceAtLeast(30L)
                lastFrameMs = 0L

                imageReader?.setOnImageAvailableListener({ reader ->
                    val img = reader.acquireLatestImage() ?: return@setOnImageAvailableListener
                    try {
                        val now = System.currentTimeMillis()
                        if (now - lastFrameMs < minFrameIntervalMs) {
                            img.close()
                            return@setOnImageAvailableListener
                        }
                        lastFrameMs = now

                        val plane = img.planes[0]
                        val buffer: ByteBuffer = plane.buffer
                        val pixelStride = plane.pixelStride
                        val rowStride = plane.rowStride
                        val rowPadding = rowStride - pixelStride * shareWidth

                        val rawBmp = Bitmap.createBitmap(
                            shareWidth + rowPadding / pixelStride,
                            shareHeight,
                            Bitmap.Config.ARGB_8888
                        )
                        rawBmp.copyPixelsFromBuffer(buffer)
                        val cropped = Bitmap.createBitmap(rawBmp, 0, 0, shareWidth, shareHeight)
                        rawBmp.recycle()

                        val baos = ByteArrayOutputStream()
                        cropped.compress(Bitmap.CompressFormat.JPEG, 60, baos)
                        cropped.recycle()

                        val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                        val dataUrl = "data:image/jpeg;base64,$b64"
                        val quoted = JSONObject.quote(dataUrl)

                        mainHandler.post {
                            bridge?.webView?.evaluateJavascript(
                                "window.__zovioAndroidScreenFrame && window.__zovioAndroidScreenFrame($quoted);",
                                null
                            )
                        }
                    } catch (_: Exception) {
                    } finally {
                        try { img.close() } catch (_: Exception) {}
                    }
                }, projectionHandler)

                val densityDpi = context.resources.displayMetrics.densityDpi
                virtualDisplay = mediaProjection?.createVirtualDisplay(
                    "ZovioScreenShare",
                    shareWidth,
                    shareHeight,
                    densityDpi,
                    DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                    imageReader?.surface,
                    null,
                    projectionHandler
                )

                call.resolve(
                    JSObject()
                        .put("ok", true)
                        .put("width", shareWidth)
                        .put("height", shareHeight)
                )
            } catch (e: Exception) {
                stopProjectionInternal()
                call.resolve(JSObject().put("ok", false).put("error", e.message ?: "Projection failed"))
            } finally {
                isStartingProjection = false
            }
        }, 120L)
    }

    @PluginMethod
    fun stopScreenShare(call: PluginCall) {
        isStartingProjection = false
        stopProjectionInternal()
        val intent = Intent(context, ZovioCallService::class.java).apply {
            action = ZovioCallService.ACTION_DISABLE_SCREEN_SHARE
        }
        try { context.startService(intent) } catch (_: Exception) {}
        call.resolve(JSObject().put("ok", true))
    }

    @PluginMethod
    fun scanQr(call: PluginCall) {
        val intent = Intent(context, QrScannerActivity::class.java)
        startActivityForResult(call, intent, "onQrScanResult")
    }

    @PluginMethod
    fun openAuthBrowser(call: PluginCall) {
        val url = call.getString("url")?.trim()
        if (url.isNullOrEmpty() || !url.startsWith("https://")) {
            call.reject("Valid HTTPS URL required")
            return
        }
        val act = activity
        if (act == null) {
            call.reject("Activity unavailable")
            return
        }
        act.runOnUiThread {
            try {
                val uri = Uri.parse(url)
                val tabs = CustomTabsIntent.Builder()
                    .setShowTitle(true)
                    .build()
                tabs.launchUrl(act, uri)
                call.resolve(JSObject().put("ok", true))
            } catch (_: Exception) {
                try {
                    val viewIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                    act.startActivity(viewIntent)
                    call.resolve(JSObject().put("ok", true))
                } catch (e: Exception) {
                    call.reject(e.message ?: "Failed to open external browser")
                }
            }
        }
    }

    @PluginMethod
    fun canUseBiometrics(call: PluginCall) {
        val manager = BiometricManager.from(context)
        val strongOrWeak = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK
        val status = manager.canAuthenticate(strongOrWeak)
        val strongStatus = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        call.resolve(
            JSObject()
                .put("available", status == BiometricManager.BIOMETRIC_SUCCESS)
                .put("strong", strongStatus == BiometricManager.BIOMETRIC_SUCCESS)
                .put("status", status)
        )
    }

    @PluginMethod
    fun authenticateBiometric(call: PluginCall) {
        val act = activity as? FragmentActivity
        if (act == null) {
            call.resolve(JSObject().put("ok", false).put("reason", "Activity unavailable"))
            return
        }
        val title = call.getString("title")?.trim().takeUnless { it.isNullOrEmpty() } ?: "Unlock Zovio"
        val subtitle = call.getString("subtitle")?.trim().takeUnless { it.isNullOrEmpty() } ?: "Confirm your fingerprint or face to unlock"
        val negativeText = call.getString("negativeText")?.trim().takeUnless { it.isNullOrEmpty() } ?: "Use App PIN"

        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.BIOMETRIC_WEAK
        val canAuth = BiometricManager.from(context).canAuthenticate(authenticators)
        if (canAuth != BiometricManager.BIOMETRIC_SUCCESS) {
            call.resolve(JSObject().put("ok", false).put("reason", "Biometrics unavailable").put("code", canAuth))
            return
        }

        act.runOnUiThread {
            try {
                MainActivity.isSuppressingPipForSystemDialog = true
                (act as? MainActivity)?.syncSystemPipParams()
                val executor = ContextCompat.getMainExecutor(act)
                var settled = false
                val finishAuth = { payload: JSObject ->
                    if (!settled) {
                        settled = true
                        MainActivity.isSuppressingPipForSystemDialog = false
                        (act as? MainActivity)?.syncSystemPipParams()
                        call.resolve(payload)
                    }
                }
                val prompt = BiometricPrompt(
                    act,
                    executor,
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                            super.onAuthenticationSucceeded(result)
                            finishAuth(JSObject().put("ok", true))
                        }

                        override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                            super.onAuthenticationError(errorCode, errString)
                            finishAuth(
                                JSObject()
                                    .put("ok", false)
                                    .put("code", errorCode)
                                    .put("reason", errString.toString())
                            )
                        }

                        override fun onAuthenticationFailed() {
                            super.onAuthenticationFailed()
                        }
                    }
                )
                val info = BiometricPrompt.PromptInfo.Builder()
                    .setTitle(title)
                    .setSubtitle(subtitle)
                    .setAllowedAuthenticators(authenticators)
                    .setNegativeButtonText(negativeText)
                    .setConfirmationRequired(false)
                    .build()
                prompt.authenticate(info)
            } catch (e: Exception) {
                MainActivity.isSuppressingPipForSystemDialog = false
                (act as? MainActivity)?.syncSystemPipParams()
                call.resolve(JSObject().put("ok", false).put("reason", e.message ?: "Biometric error"))
            }
        }
    }

    @ActivityCallback
    private fun onQrScanResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        if (result.resultCode == Activity.RESULT_OK) {
            val raw = result.data?.getStringExtra(QrScannerActivity.EXTRA_QR_VALUE)
            call.resolve(JSObject().put("rawValue", raw))
        } else {
            val err = result.data?.getStringExtra(QrScannerActivity.EXTRA_ERROR)
            val payload = JSObject().put("rawValue", JSONObject.NULL)
            if (!err.isNullOrBlank()) payload.put("error", err)
            call.resolve(payload)
        }
    }

    private fun stopProjectionInternal() {
        try { virtualDisplay?.release() } catch (_: Exception) {}
        virtualDisplay = null
        try { imageReader?.close() } catch (_: Exception) {}
        imageReader = null
        try { mediaProjection?.stop() } catch (_: Exception) {}
        mediaProjection = null
        try { projectionThread?.quitSafely() } catch (_: Exception) {}
        projectionThread = null
        projectionHandler = null
    }

    override fun handleOnDestroy() {
        stopProjectionInternal()
        super.handleOnDestroy()
    }
}

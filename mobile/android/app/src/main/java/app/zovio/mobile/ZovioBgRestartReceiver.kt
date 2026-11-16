package app.zovio.mobile

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class ZovioBgRestartReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_RESTART_BG = "app.zovio.mobile.ACTION_RESTART_BG"
        const val ACTION_DUE_ALERT = "app.zovio.mobile.ACTION_DUE_ALERT"
        const val EXTRA_TITLE = "alertTitle"
        const val EXTRA_BODY = "alertBody"
        const val EXTRA_CATEGORY = "alertCategory"
        const val EXTRA_TAG = "alertTag"
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action == ACTION_DUE_ALERT) {
            val prefs = context.getSharedPreferences(ZovioBgSyncService.PREFS_NAME, Context.MODE_PRIVATE)
            if (!prefs.getBoolean(ZovioBgSyncService.KEY_NOTIFY_ENABLED, true)) return
            val category = intent.getStringExtra(EXTRA_CATEGORY) ?: "reminder"
            if (category == "event" && !prefs.getBoolean(ZovioBgSyncService.KEY_NOTIFY_EVENTS, true)) return
            if (category == "task" && !prefs.getBoolean(ZovioBgSyncService.KEY_NOTIFY_TASKS, true)) return
            if (category == "reminder" && !prefs.getBoolean(ZovioBgSyncService.KEY_NOTIFY_REMINDERS, true)) return

            val showPreview = prefs.getBoolean(ZovioBgSyncService.KEY_NOTIFY_PREVIEW, true)
            val title = if (showPreview) (intent.getStringExtra(EXTRA_TITLE) ?: "Zovio Reminder") else "Zovio — Reminder"
            val body = if (showPreview) (intent.getStringExtra(EXTRA_BODY) ?: "") else "Open Zovio to view scheduled reminder"
            val tag = intent.getStringExtra(EXTRA_TAG) ?: "ws-reminder"
            ZovioBgSyncService.showReminderNotification(
                context = context,
                title = title,
                body = body,
                tag = tag,
                category = category,
                silent = ZovioBgSyncService.isDndOrMuted(context)
            )
            return
        }

        if (
            action == Intent.ACTION_BOOT_COMPLETED ||
            action == Intent.ACTION_LOCKED_BOOT_COMPLETED ||
            action == Intent.ACTION_MY_PACKAGE_REPLACED ||
            action == "android.intent.action.QUICKBOOT_POWERON" ||
            action == "com.htc.intent.action.QUICKBOOT_POWERON" ||
            action == ACTION_RESTART_BG
        ) {
            if (ZovioBgSyncService.isBgKeepAliveEnabled(context)) {
                ZovioBgSyncService.startOrRefresh(context)
            }
        }
    }
}

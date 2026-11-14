package app.zovio.mobile.nativeapp

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.core.content.ContextCompat
import app.zovio.mobile.MainActivity
import app.zovio.mobile.ZovioBgSyncService
import app.zovio.mobile.nativeapp.ui.ZovioViewModel
import app.zovio.mobile.nativeapp.ui.screens.AuthScreen
import app.zovio.mobile.nativeapp.ui.screens.ChatScreen
import app.zovio.mobile.nativeapp.ui.screens.HomeScreen
import app.zovio.mobile.nativeapp.ui.theme.ZovioTheme

class ZovioNativeActivity : ComponentActivity() {

    private val vm: ZovioViewModel by viewModels()

    private val notifPermLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        requestNotificationPermissionIfNeeded()
        handleIntent(intent)

        setContent {
            val session by vm.session.collectAsState()
            val wsConnected by vm.wsConnected.collectAsState()
            val chats by vm.chats.collectAsState()
            val users by vm.users.collectAsState()
            val callHistory by vm.callHistory.collectAsState()
            val statuses by vm.statuses.collectAsState()
            val channels by vm.channels.collectAsState()
            val activeChatId by vm.activeChatId.collectAsState()
            val activeChat by vm.activeChat.collectAsState()
            val activeMessages by vm.activeMessages.collectAsState()
            val typingByChat by vm.typingByChat.collectAsState()
            val authBusy by vm.authBusy.collectAsState()
            val authError by vm.authError.collectAsState()

            LaunchedEffect(Unit) {
                vm.toast.collect { msg ->
                    Toast.makeText(this@ZovioNativeActivity, msg, Toast.LENGTH_SHORT).show()
                }
            }

            ZovioTheme(darkTheme = session.darkTheme) {
                if (!session.isLoggedIn) {
                    AuthScreen(
                        busy = authBusy,
                        error = authError,
                        onLogin = { e, p -> vm.login(e, p) },
                        onSendOtp = { e, cb -> vm.sendOtp(e, cb) },
                        onRegister = { e, o, u, n, p -> vm.register(e, o, u, n, p) },
                        onOpenGoogleWebSignIn = { openWebActivity(routeView = "googleAuth") },
                        onClearError = { vm.clearAuthError() }
                    )
                } else {
                    BackHandler(enabled = activeChatId != null) {
                        vm.closeChat()
                    }

                    AnimatedContent(
                        targetState = activeChatId,
                        transitionSpec = {
                            if (targetState != null) {
                                (slideInHorizontally { it / 3 } + fadeIn()) togetherWith
                                    (slideOutHorizontally { -it / 5 } + fadeOut())
                            } else {
                                (slideInHorizontally { -it / 3 } + fadeIn()) togetherWith
                                    (slideOutHorizontally { it / 3 } + fadeOut())
                            }
                        },
                        label = "nav"
                    ) { currentChatId ->
                        if (currentChatId == null) {
                            HomeScreen(
                                session = session,
                                wsConnected = wsConnected,
                                chats = chats,
                                users = users,
                                callHistory = callHistory,
                                statuses = statuses,
                                channels = channels,
                                typingByChat = typingByChat,
                                baseHttpUrl = vm.repo.sessionStore.baseHttpUrl,
                                onOpenChat = { cid -> vm.openChat(cid) },
                                onStartDm = { peer -> vm.startDm(peer) },
                                onRefresh = { vm.refreshAll() },
                                onToggleTheme = { dark -> vm.toggleDarkTheme(dark) },
                                onOpenWebFallback = { routeView -> openWebActivity(routeView = routeView) },
                                onLogout = { vm.logout() }
                            )
                        } else {
                            ChatScreen(
                                chat = activeChat,
                                chatId = currentChatId,
                                messagesDesc = activeMessages,
                                allChats = chats,
                                myUserId = session.userId,
                                typingText = typingByChat[currentChatId],
                                baseHttpUrl = vm.repo.sessionStore.baseHttpUrl,
                                repo = vm.repo,
                                onBack = { vm.closeChat() },
                                onSendText = { txt, replyId -> vm.sendText(currentChatId, txt, replyId) },
                                onSendAttachment = { uri, cap, replyId -> vm.sendAttachment(currentChatId, uri, cap, replyId) },
                                onEditMessage = { mid, txt -> vm.editMessage(mid, txt) },
                                onToggleReaction = { mid, em -> vm.toggleReaction(mid, em) },
                                onDeleteForMe = { ids -> vm.deleteForMe(ids) },
                                onDeleteForEveryone = { ids -> vm.deleteForEveryone(ids) },
                                onToggleStar = { mid -> vm.toggleStar(mid) },
                                onForwardMessages = { mids, cids, done -> vm.forwardMessages(mids, cids, done) },
                                onStartCall = { mode -> openWebActivity(routeView = "call", chatId = currentChatId, callMode = mode) }
                            )
                        }
                    }
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        ZovioBgSyncService.isAppInForeground = true
        ZovioBgSyncService.startOrRefresh(this)
        vm.refreshOnResume()
    }

    override fun onPause() {
        ZovioBgSyncService.isAppInForeground = false
        ZovioBgSyncService.startOrRefresh(this)
        super.onPause()
    }

    private fun handleIntent(intent: Intent?) {
        val chatId = intent?.getStringExtra("chatId")?.trim().orEmpty()
        if (chatId.isNotEmpty()) {
            vm.openChat(chatId)
        }
    }

    private fun openWebActivity(routeView: String, chatId: String? = null, callMode: String? = null) {
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("routeView", routeView)
            if (!chatId.isNullOrBlank()) putExtra("chatId", chatId)
            if (!callMode.isNullOrBlank()) putExtra("callMode", callMode)
        }
        startActivity(intent)
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                notifPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
    }
}

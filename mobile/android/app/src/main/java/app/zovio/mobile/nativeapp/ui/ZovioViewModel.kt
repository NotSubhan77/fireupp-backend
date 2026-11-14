package app.zovio.mobile.nativeapp.ui

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.zovio.mobile.nativeapp.data.ZovioRepository
import app.zovio.mobile.nativeapp.data.db.CallHistoryEntity
import app.zovio.mobile.nativeapp.data.db.ChannelEntity
import app.zovio.mobile.nativeapp.data.db.ChatEntity
import app.zovio.mobile.nativeapp.data.db.MessageEntity
import app.zovio.mobile.nativeapp.data.db.StatusEntity
import app.zovio.mobile.nativeapp.data.db.UserCacheEntity
import app.zovio.mobile.nativeapp.data.prefs.ZovioSession
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class ZovioViewModel(application: Application) : AndroidViewModel(application) {

    val repo = ZovioRepository(application.applicationContext)

    val session: StateFlow<ZovioSession> = repo.sessionStore.session
    val wsConnected: StateFlow<Boolean> = repo.wsConnected
    val typingByChat: StateFlow<Map<String, String>> = repo.typingByChat

    val chats: StateFlow<List<ChatEntity>> = repo.chatsFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val users: StateFlow<List<UserCacheEntity>> = repo.usersFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val callHistory: StateFlow<List<CallHistoryEntity>> = repo.callHistoryFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val statuses: StateFlow<List<StatusEntity>> = repo.statusesFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val channels: StateFlow<List<ChannelEntity>> = repo.channelsFlow
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _activeChatId = MutableStateFlow<String?>(null)
    val activeChatId: StateFlow<String?> = _activeChatId.asStateFlow()

    val activeChat: StateFlow<ChatEntity?> = _activeChatId
        .flatMapLatest { cid -> if (cid == null) flowOf(null) else repo.observeChat(cid) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    // Messages ordered newest-first for LazyColumn(reverseLayout = true)
    val activeMessages: StateFlow<List<MessageEntity>> = _activeChatId
        .flatMapLatest { cid -> if (cid == null) flowOf(emptyList()) else repo.observeMessages(cid) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val _authBusy = MutableStateFlow(false)
    val authBusy: StateFlow<Boolean> = _authBusy.asStateFlow()

    private val _authError = MutableStateFlow<String?>(null)
    val authError: StateFlow<String?> = _authError.asStateFlow()

    private val _toast = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val toast = _toast.asSharedFlow()

    init {
        if (session.value.isLoggedIn) {
            repo.startRealtime()
            viewModelScope.launch { repo.syncAllInitial() }
        }
    }

    fun refreshOnResume() {
        repo.sessionStore.reload()
        if (session.value.isLoggedIn) {
            repo.startRealtime()
            viewModelScope.launch { repo.syncAllInitial() }
        }
    }

    fun openChat(chatId: String) {
        _activeChatId.value = chatId
        viewModelScope.launch {
            repo.markChatRead(chatId)
            repo.syncMessages(chatId)
        }
    }

    fun closeChat() {
        _activeChatId.value = null
    }

    fun clearAuthError() {
        _authError.value = null
    }

    fun login(emailOrUser: String, password: String) {
        viewModelScope.launch {
            _authBusy.value = true
            _authError.value = null
            val res = repo.loginWithPassword(emailOrUser, password)
            _authBusy.value = false
            res.onFailure { _authError.value = it.message ?: "Sign in failed" }
        }
    }

    fun sendOtp(email: String, onSent: () -> Unit) {
        viewModelScope.launch {
            _authBusy.value = true
            _authError.value = null
            val res = repo.sendRegisterOtp(email)
            _authBusy.value = false
            res.onSuccess {
                _toast.tryEmit("Verification code sent to $email")
                onSent()
            }.onFailure {
                _authError.value = it.message ?: "Could not send code"
            }
        }
    }

    fun register(email: String, otp: String, username: String, name: String, password: String) {
        viewModelScope.launch {
            _authBusy.value = true
            _authError.value = null
            val res = repo.registerAccount(email, otp, username, name, password)
            _authBusy.value = false
            res.onFailure { _authError.value = it.message ?: "Registration failed" }
        }
    }

    fun logout() {
        _activeChatId.value = null
        viewModelScope.launch { repo.logout() }
    }

    fun toggleDarkTheme(dark: Boolean) {
        repo.sessionStore.setDarkTheme(dark)
    }

    fun sendText(chatId: String, text: String, replyToId: String? = null) {
        viewModelScope.launch {
            repo.sendTextMessage(chatId, text, replyToId)
                .onFailure { _toast.tryEmit(it.message ?: "Failed to send message") }
        }
    }

    fun sendAttachment(chatId: String, uri: Uri, caption: String = "", replyToId: String? = null) {
        viewModelScope.launch {
            _toast.tryEmit("Encrypting & uploading…")
            repo.sendUriAttachment(chatId, uri, caption, replyToId)
                .onFailure { _toast.tryEmit(it.message ?: "Upload failed") }
        }
    }

    fun editMessage(msgId: String, newText: String) {
        viewModelScope.launch {
            repo.editMessage(msgId, newText)
                .onFailure { _toast.tryEmit(it.message ?: "Edit failed") }
        }
    }

    fun toggleReaction(msgId: String, emoji: String) {
        viewModelScope.launch { repo.toggleReaction(msgId, emoji) }
    }

    fun deleteForMe(msgIds: Collection<String>) {
        viewModelScope.launch {
            msgIds.forEach { repo.deleteMessageForMe(it) }
        }
    }

    fun deleteForEveryone(msgIds: Collection<String>) {
        viewModelScope.launch {
            msgIds.forEach { repo.deleteMessageForEveryone(it) }
        }
    }

    fun toggleStar(msgId: String) {
        viewModelScope.launch { repo.toggleStar(msgId) }
    }

    fun forwardMessages(msgIds: List<String>, targetChatIds: List<String>, onDone: () -> Unit) {
        viewModelScope.launch {
            repo.forwardMessages(msgIds, targetChatIds)
                .onSuccess {
                    _toast.tryEmit("Forwarded to ${targetChatIds.size} chat(s)")
                    onDone()
                }
                .onFailure { _toast.tryEmit(it.message ?: "Forward failed") }
        }
    }

    fun startDm(peer: UserCacheEntity) {
        viewModelScope.launch {
            repo.startDirectChat(peer)
                .onSuccess { cid -> openChat(cid) }
                .onFailure { _toast.tryEmit(it.message ?: "Could not open chat") }
        }
    }

    fun refreshAll() {
        viewModelScope.launch { repo.syncAllInitial() }
    }
}

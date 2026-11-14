package app.zovio.mobile.nativeapp.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.MimeTypeMap
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Forward
import androidx.compose.material.icons.automirrored.rounded.Reply
import androidx.compose.material.icons.automirrored.rounded.Send
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Description
import androidx.compose.material.icons.rounded.Done
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.MoreVert
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.FileProvider
import app.zovio.mobile.nativeapp.data.ZovioRepository
import app.zovio.mobile.nativeapp.data.db.ChatEntity
import app.zovio.mobile.nativeapp.data.db.MessageEntity
import app.zovio.mobile.nativeapp.ui.components.ZovioAvatar
import app.zovio.mobile.nativeapp.ui.components.formatChatListTime
import app.zovio.mobile.nativeapp.ui.components.formatMsgTime
import app.zovio.mobile.nativeapp.ui.theme.ZovioBrand
import app.zovio.mobile.nativeapp.ui.theme.ZovioDanger
import app.zovio.mobile.nativeapp.ui.theme.ZovioGreenTick
import app.zovio.mobile.nativeapp.ui.theme.ZovioOnline
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import kotlin.math.roundToInt

private val QUICK_REACTIONS = listOf("❤️", "😂", "😮", "😢", "🙏", "👍")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    chat: ChatEntity?,
    chatId: String,
    messagesDesc: List<MessageEntity>, // Ordered newest -> oldest for reverseLayout = true
    allChats: List<ChatEntity>,
    myUserId: String,
    typingText: String?,
    baseHttpUrl: String,
    repo: ZovioRepository,
    onBack: () -> Unit,
    onSendText: (String, replyToId: String?) -> Unit,
    onSendAttachment: (Uri, caption: String, replyToId: String?) -> Unit,
    onEditMessage: (msgId: String, newText: String) -> Unit,
    onToggleReaction: (msgId: String, emoji: String) -> Unit,
    onDeleteForMe: (Collection<String>) -> Unit,
    onDeleteForEveryone: (Collection<String>) -> Unit,
    onToggleStar: (String) -> Unit,
    onForwardMessages: (msgIds: List<String>, targetChatIds: List<String>, onDone: () -> Unit) -> Unit,
    onStartCall: (mode: String) -> Unit
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    var inputText by remember(chatId) { mutableStateOf("") }
    var replyTarget by remember(chatId) { mutableStateOf<MessageEntity?>(null) }
    var editTarget by remember(chatId) { mutableStateOf<MessageEntity?>(null) }
    var selectedIds by remember(chatId) { mutableStateOf<Set<String>>(emptySet()) }
    var showOverflowMenu by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showForwardSheet by remember { mutableStateOf(false) }
    var forwardExplicitIds by remember { mutableStateOf<List<String>?>(null) }
    var mediaLightboxMsg by remember { mutableStateOf<MessageEntity?>(null) }
    val resolvedFiles = remember { mutableStateMapOf<String, String>() }

    val isSelecting = selectedIds.isNotEmpty()
    val selectedMessages = remember(selectedIds, messagesDesc) {
        messagesDesc.filter { selectedIds.contains(it.id) }
    }

    val filePicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            onSendAttachment(uri, inputText, replyTarget?.id)
            inputText = ""
            replyTarget = null
        }
    }

    // Back press clears selection first before leaving chat
    BackHandler {
        when {
            mediaLightboxMsg != null -> mediaLightboxMsg = null
            isSelecting -> selectedIds = emptySet()
            editTarget != null -> {
                editTarget = null
                inputText = ""
            }
            else -> onBack()
        }
    }

    // Trigger typing indicator when user edits box
    LaunchedEffect(inputText) {
        repo.sendTyping(chatId, inputText.isNotEmpty())
    }

    val singleSelected = if (selectedMessages.size == 1) selectedMessages.first() else null

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .imePadding()
    ) {
        // ---- Top AppBar (Normal OR WhatsApp Selection Action Bar) ----
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .statusBarsPadding()
                    .fillMaxWidth()
                    .height(60.dp)
                    .padding(horizontal = 6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                if (isSelecting) {
                    IconButton(onClick = { selectedIds = emptySet() }) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Clear selection")
                    }
                    Text(
                        text = "${selectedIds.size}",
                        fontSize = 19.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.weight(1f).padding(start = 6.dp)
                    )
                    if (singleSelected != null && !singleSelected.isDeleted) {
                        IconButton(onClick = {
                            replyTarget = singleSelected
                            selectedIds = emptySet()
                        }) {
                            Icon(Icons.AutoMirrored.Rounded.Reply, contentDescription = "Reply")
                        }
                    }
                    if (singleSelected != null && !singleSelected.isDeleted) {
                        IconButton(onClick = {
                            onToggleStar(singleSelected.id)
                            selectedIds = emptySet()
                        }) {
                            Icon(Icons.Rounded.Star, contentDescription = "Star")
                        }
                    }
                    IconButton(onClick = {
                        val copyText = selectedMessages
                            .sortedBy { it.ts }
                            .joinToString("\n") { it.plainText }
                            .trim()
                        if (copyText.isNotEmpty()) {
                            val cb = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            cb.setPrimaryClip(ClipData.newPlainText("Zovio", copyText))
                        }
                        selectedIds = emptySet()
                    }) {
                        Icon(Icons.Rounded.ContentCopy, contentDescription = "Copy")
                    }
                    IconButton(onClick = { showDeleteDialog = true }) {
                        Icon(Icons.Rounded.Delete, contentDescription = "Delete")
                    }
                    IconButton(onClick = {
                        forwardExplicitIds = selectedIds.toList()
                        showForwardSheet = true
                    }) {
                        Icon(Icons.AutoMirrored.Rounded.Forward, contentDescription = "Forward")
                    }
                    if (singleSelected != null && singleSelected.senderId == myUserId && singleSelected.kind == "text" && !singleSelected.isDeleted) {
                        Box {
                            IconButton(onClick = { showOverflowMenu = true }) {
                                Icon(Icons.Rounded.MoreVert, contentDescription = "More")
                            }
                            DropdownMenu(
                                expanded = showOverflowMenu,
                                onDismissRequest = { showOverflowMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text("Edit") },
                                    leadingIcon = { Icon(Icons.Rounded.Edit, null) },
                                    onClick = {
                                        showOverflowMenu = false
                                        editTarget = singleSelected
                                        inputText = singleSelected.plainText
                                        selectedIds = emptySet()
                                    }
                                )
                            }
                        }
                    }
                } else {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                    ZovioAvatar(
                        name = chat?.name ?: "Chat",
                        avatarUrl = chat?.avatar,
                        colorHex = chat?.avatarColor ?: "#7C5CFF",
                        size = 40.dp,
                        online = chat?.type == "dm" && chat.peerOnline,
                        baseHttpUrl = baseHttpUrl
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = chat?.name ?: "Conversation",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        val subtitle = when {
                            !typingText.isNullOrBlank() -> typingText
                            chat?.type == "dm" && chat.peerOnline -> "online"
                            chat?.type == "dm" && chat.peerLastSeen > 0L -> "last seen ${formatChatListTime(chat.peerLastSeen)}"
                            chat?.type == "self" -> "Your personal encrypted notes"
                            else -> "End-to-end encrypted"
                        }
                        Text(
                            text = subtitle,
                            fontSize = 12.sp,
                            color = if (!typingText.isNullOrBlank() || (chat?.type == "dm" && chat.peerOnline)) {
                                ZovioOnline
                            } else {
                                MaterialTheme.colorScheme.onSurfaceVariant
                            },
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    IconButton(onClick = { onStartCall("video") }) {
                        Icon(Icons.Rounded.Videocam, contentDescription = "Video Call")
                    }
                    IconButton(onClick = { onStartCall("audio") }) {
                        Icon(Icons.Rounded.Call, contentDescription = "Voice Call")
                    }
                }
            }
        }

        // ---- Floating Single-Message WhatsApp Reaction Pill ----
        AnimatedVisibility(visible = singleSelected != null && !singleSelected.isDeleted) {
            singleSelected?.let { target ->
                Surface(
                    shape = RoundedCornerShape(999.dp),
                    color = MaterialTheme.colorScheme.surfaceVariant,
                    shadowElevation = 6.dp,
                    modifier = Modifier
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                        .align(Alignment.CenterHorizontally)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        QUICK_REACTIONS.forEach { emoji ->
                            Text(
                                text = emoji,
                                fontSize = 22.sp,
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .clickable {
                                        onToggleReaction(target.id, emoji)
                                        selectedIds = emptySet()
                                    }
                                    .padding(horizontal = 4.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }

        // ---- Messages List (reverseLayout = true -> Item 0 = Newest pinned cleanly at bottom) ----
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            LazyColumn(
                state = listState,
                reverseLayout = true,
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(messagesDesc, key = { it.id }) { msg ->
                    val cachedPath = resolvedFiles[msg.id] ?: msg.localMediaPath
                    LaunchedEffect(msg.id, msg.fileId, cachedPath) {
                        if (msg.kind == "image" && cachedPath.isNullOrBlank() && !msg.fileId.isNullOrBlank()) {
                            val file = repo.ensureMediaCached(msg)
                            if (file != null) resolvedFiles[msg.id] = file.absolutePath
                        }
                    }

                    MessageRow(
                        msg = msg,
                        isMine = msg.senderId == myUserId,
                        isGroup = chat?.type == "group",
                        myUserId = myUserId,
                        isSelectMode = isSelecting,
                        isSelected = selectedIds.contains(msg.id),
                        cachedMediaPath = cachedPath,
                        onTap = {
                            if (isSelecting) {
                                selectedIds = if (selectedIds.contains(msg.id)) {
                                    selectedIds - msg.id
                                } else {
                                    selectedIds + msg.id
                                }
                            } else if (msg.kind == "image" && !msg.isDeleted) {
                                scope.launch {
                                    if (resolvedFiles[msg.id].isNullOrBlank() && !msg.fileId.isNullOrBlank()) {
                                        repo.ensureMediaCached(msg)?.let { resolvedFiles[msg.id] = it.absolutePath }
                                    }
                                    mediaLightboxMsg = msg
                                }
                            } else if ((msg.kind == "file" || msg.kind == "video" || msg.kind == "audio") && !msg.isDeleted) {
                                scope.launch {
                                    val file = if (!cachedPath.isNullOrBlank()) File(cachedPath) else repo.ensureMediaCached(msg)
                                    if (file != null) {
                                        resolvedFiles[msg.id] = file.absolutePath
                                        shareOrOpenFile(context, file, msg.mimeType)
                                    }
                                }
                            }
                        },
                        onLongPress = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            selectedIds = if (selectedIds.isEmpty()) setOf(msg.id)
                            else if (selectedIds.contains(msg.id)) selectedIds - msg.id
                            else selectedIds + msg.id
                        },
                        onSwipeReply = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            replyTarget = msg
                        },
                        onSwipeForward = {
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            forwardExplicitIds = listOf(msg.id)
                            showForwardSheet = true
                        },
                        onJumpToReply = { targetId ->
                            val idx = messagesDesc.indexOfFirst { it.id == targetId }
                            if (idx >= 0) {
                                scope.launch { listState.animateScrollToItem(idx) }
                            }
                        },
                        onReactionTap = { emoji ->
                            onToggleReaction(msg.id, emoji)
                        }
                    )
                }
            }
        }

        // ---- Reply / Edit Banner ----
        AnimatedVisibility(visible = replyTarget != null || editTarget != null) {
            Surface(
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(34.dp)
                            .background(ZovioBrand, RoundedCornerShape(2.dp))
                    )
                    Spacer(Modifier.width(10.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (editTarget != null) "Editing message" else "Replying to ${replyTarget?.senderName ?: ""}",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = ZovioBrand
                        )
                        Text(
                            text = (editTarget?.plainText ?: replyTarget?.plainText ?: "").ifBlank { "Attachment" },
                            fontSize = 12.5.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = {
                        replyTarget = null
                        if (editTarget != null) {
                            editTarget = null
                            inputText = ""
                        }
                    }) {
                        Icon(Icons.Rounded.Close, contentDescription = "Cancel", modifier = Modifier.size(18.dp))
                    }
                }
            }
        }

        // ---- WhatsApp-style Persistent Input Composer (Keyboard NEVER closes on send!) ----
        Surface(
            color = MaterialTheme.colorScheme.surface,
            tonalElevation = 2.dp,
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.Bottom
            ) {
                IconButton(
                    onClick = { filePicker.launch("*/*") },
                    modifier = Modifier.size(44.dp)
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = "Attach", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                }

                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(22.dp))
                        .background(MaterialTheme.colorScheme.surfaceVariant)
                        .padding(horizontal = 16.dp, vertical = 11.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    if (inputText.isEmpty()) {
                        Text(
                            text = if (editTarget != null) "Edit message…" else "Write a message…",
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            fontSize = 15.sp
                        )
                    }
                    BasicTextField(
                        value = inputText,
                        onValueChange = { inputText = it },
                        textStyle = TextStyle(
                            color = MaterialTheme.colorScheme.onSurface,
                            fontSize = 15.sp
                        ),
                        cursorBrush = SolidColor(ZovioBrand),
                        maxLines = 5,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(Modifier.width(8.dp))

                Surface(
                    shape = CircleShape,
                    color = ZovioBrand,
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .clickable {
                            val txt = inputText.trim()
                            if (txt.isEmpty()) return@clickable
                            if (editTarget != null) {
                                onEditMessage(editTarget!!.id, txt)
                                editTarget = null
                            } else {
                                onSendText(txt, replyTarget?.id)
                                replyTarget = null
                            }
                            inputText = ""
                        }
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            imageVector = if (editTarget != null) Icons.Rounded.Done else Icons.AutoMirrored.Rounded.Send,
                            contentDescription = "Send",
                            tint = Color.White,
                            modifier = Modifier.size(21.dp)
                        )
                    }
                }
            }
        }
    }

    // ---- Delete Confirmation Dialog ----
    if (showDeleteDialog) {
        val canEveryone = selectedMessages.all { it.senderId == myUserId }
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text("Delete ${selectedIds.size} message(s)?") },
            text = { Text("Choose how you want to remove the selected message(s).") },
            confirmButton = {
                Column(horizontalAlignment = Alignment.End) {
                    if (canEveryone) {
                        TextButton(onClick = {
                            onDeleteForEveryone(selectedIds.toList())
                            selectedIds = emptySet()
                            showDeleteDialog = false
                        }) {
                            Text("Delete for everyone", color = ZovioDanger)
                        }
                    }
                    TextButton(onClick = {
                        onDeleteForMe(selectedIds.toList())
                        selectedIds = emptySet()
                        showDeleteDialog = false
                    }) {
                        Text("Delete for me", color = ZovioDanger)
                    }
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text("Cancel") }
            }
        )
    }

    // ---- WhatsApp Forward Sheet ----
    if (showForwardSheet) {
        ModalBottomSheet(onDismissRequest = {
            showForwardSheet = false
            forwardExplicitIds = null
        }) {
            var targetIds by remember { mutableStateOf<Set<String>>(emptySet()) }
            var query by remember { mutableStateOf("") }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 6.dp)
            ) {
                Text("Forward to…", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                LazyColumn(modifier = Modifier.height(300.dp)) {
                    val candidates = allChats.filter {
                        it.type != "channel" && (query.isBlank() || it.name.contains(query, true))
                    }
                    items(candidates, key = { it.id }) { c ->
                        val checked = targetIds.contains(c.id)
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    targetIds = if (checked) targetIds - c.id else targetIds + c.id
                                }
                                .padding(vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Checkbox(
                                checked = checked,
                                onCheckedChange = {
                                    targetIds = if (checked) targetIds - c.id else targetIds + c.id
                                }
                            )
                            ZovioAvatar(name = c.name, avatarUrl = c.avatar, colorHex = c.avatarColor, size = 38.dp, baseHttpUrl = baseHttpUrl)
                            Spacer(Modifier.width(10.dp))
                            Text(c.name, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
                Spacer(Modifier.height(10.dp))
                Button(
                    onClick = {
                        val ids = forwardExplicitIds ?: selectedIds.toList()
                        onForwardMessages(ids, targetIds.toList()) {
                            showForwardSheet = false
                            forwardExplicitIds = null
                            selectedIds = emptySet()
                        }
                    },
                    enabled = targetIds.isNotEmpty(),
                    colors = ButtonDefaults.buttonColors(containerColor = ZovioBrand),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth().height(48.dp)
                ) {
                    Text("Forward (${targetIds.size})", fontWeight = FontWeight.Bold)
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    // ---- Fullscreen Image Lightbox with Native Share ----
    mediaLightboxMsg?.let { imgMsg ->
        val path = resolvedFiles[imgMsg.id] ?: imgMsg.localMediaPath
        Dialog(
            onDismissRequest = { mediaLightboxMsg = null },
            properties = DialogProperties(usePlatformDefaultWidth = false)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                if (!path.isNullOrBlank()) {
                    AsyncImage(
                        model = File(path),
                        contentDescription = "Photo",
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxSize()
                    )
                }
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    IconButton(onClick = { mediaLightboxMsg = null }) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Close", tint = Color.White)
                    }
                    if (!path.isNullOrBlank()) {
                        IconButton(onClick = { shareFileOnly(context, File(path), imgMsg.mimeType ?: "image/*") }) {
                            Icon(Icons.Rounded.Share, contentDescription = "Share", tint = Color.White)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun MessageRow(
    msg: MessageEntity,
    isMine: Boolean,
    isGroup: Boolean,
    myUserId: String,
    isSelectMode: Boolean,
    isSelected: Boolean,
    cachedMediaPath: String?,
    onTap: () -> Unit,
    onLongPress: () -> Unit,
    onSwipeReply: () -> Unit,
    onSwipeForward: () -> Unit,
    onJumpToReply: (String) -> Unit,
    onReactionTap: (String) -> Unit
) {
    val scope = rememberCoroutineScope()
    val dragOffset = remember { Animatable(0f) }

    val bubbleBg = if (isMine) ZovioBrand.copy(alpha = 0.92f) else MaterialTheme.colorScheme.surfaceVariant
    val textColor = if (isMine) Color.White else MaterialTheme.colorScheme.onSurface
    val subTextColor = if (isMine) Color.White.copy(alpha = 0.78f) else MaterialTheme.colorScheme.onSurfaceVariant

    val reactions = remember(msg.reactionsJson) { parseReactions(msg.reactionsJson) }
    val readCount = remember(msg.readByJson) {
        runCatching { JSONArray(msg.readByJson).length() }.getOrDefault(1)
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (isSelected) ZovioBrand.copy(alpha = 0.18f) else Color.Transparent,
                RoundedCornerShape(14.dp)
            )
            .pointerInput(msg.id, msg.isDeleted) {
                if (msg.isDeleted) return@pointerInput
                detectHorizontalDragGestures(
                    onDragEnd = {
                        val dx = dragOffset.value
                        scope.launch {
                            if (dx > 120f) onSwipeReply()
                            else if (dx < -120f) onSwipeForward()
                            dragOffset.animateTo(
                                0f,
                                animationSpec = spring(stiffness = Spring.StiffnessMedium)
                            )
                        }
                    },
                    onDragCancel = {
                        scope.launch { dragOffset.animateTo(0f) }
                    },
                    onHorizontalDrag = { _, dragAmount ->
                        scope.launch {
                            val next = (dragOffset.value + dragAmount).coerceIn(-160f, 160f)
                            dragOffset.snapTo(next)
                        }
                    }
                )
            }
            .combinedClickable(
                onClick = onTap,
                onLongClick = onLongPress
            )
            .padding(horizontal = 4.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = if (isMine) Arrangement.End else Arrangement.Start
    ) {
        if (isSelectMode && !isMine) {
            Icon(
                imageVector = if (isSelected) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (isSelected) ZovioBrand else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(end = 8.dp).size(22.dp)
            )
        }

        Column(
            modifier = Modifier
                .offset { IntOffset(dragOffset.value.roundToInt(), 0) }
                .widthIn(max = 295.dp),
            horizontalAlignment = if (isMine) Alignment.End else Alignment.Start
        ) {
            Surface(
                shape = RoundedCornerShape(
                    topStart = 18.dp,
                    topEnd = 18.dp,
                    bottomStart = if (isMine) 18.dp else 5.dp,
                    bottomEnd = if (isMine) 5.dp else 18.dp
                ),
                color = bubbleBg,
                tonalElevation = 1.dp
            ) {
                Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                    if (isGroup && !isMine && msg.senderName.isNotBlank()) {
                        Text(
                            text = msg.senderName,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Bold,
                            color = ZovioBrand
                        )
                    }

                    if (!msg.forwardedFrom.isNullOrBlank() && !msg.isDeleted) {
                        Text(
                            text = "↪ Forwarded",
                            fontSize = 11.sp,
                            fontStyle = FontStyle.Italic,
                            color = subTextColor
                        )
                    }

                    // Reply Quote Block
                    if (!msg.replyToId.isNullOrBlank() && !msg.isDeleted) {
                        Surface(
                            color = Color.Black.copy(alpha = if (isMine) 0.2f else 0.08f),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 5.dp)
                                .clickable { onJumpToReply(msg.replyToId) }
                        ) {
                            Row(modifier = Modifier.padding(8.dp)) {
                                Box(
                                    modifier = Modifier
                                        .width(3.dp)
                                        .height(26.dp)
                                        .background(if (isMine) Color.White else ZovioBrand)
                                )
                                Spacer(Modifier.width(8.dp))
                                Column {
                                    Text(
                                        text = msg.replySender ?: "Reply",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isMine) Color.White else ZovioBrand
                                    )
                                    Text(
                                        text = msg.replyPreview ?: "Message",
                                        fontSize = 11.5.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        color = subTextColor
                                    )
                                }
                            }
                        }
                    }

                    if (msg.isDeleted) {
                        Text(
                            text = "🚫 This message was deleted",
                            fontStyle = FontStyle.Italic,
                            fontSize = 14.sp,
                            color = subTextColor
                        )
                    } else if (msg.kind == "image") {
                        if (!cachedMediaPath.isNullOrBlank()) {
                            AsyncImage(
                                model = File(cachedMediaPath),
                                contentDescription = "Image",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(210.dp)
                                    .clip(RoundedCornerShape(12.dp))
                            )
                        } else {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(140.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(Color.Black.copy(alpha = 0.22f)),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("Decrypting photo…", color = textColor, fontSize = 12.sp)
                            }
                        }
                        if (msg.plainText.isNotBlank()) {
                            Spacer(Modifier.height(5.dp))
                            Text(msg.plainText, color = textColor, fontSize = 14.5.sp)
                        }
                    } else if (msg.kind == "file" || msg.kind == "video" || msg.kind == "audio") {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(vertical = 2.dp)
                        ) {
                            Icon(
                                Icons.Rounded.Description,
                                contentDescription = null,
                                tint = textColor,
                                modifier = Modifier.size(26.dp)
                            )
                            Spacer(Modifier.width(8.dp))
                            Column {
                                Text(
                                    text = msg.fileName ?: msg.plainText.ifBlank { msg.kind.uppercase() },
                                    color = textColor,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 14.sp,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis
                                )
                                if (msg.fileSize > 0L) {
                                    Text(
                                        text = "${maxOf(1L, msg.fileSize / 1024)} KB • Tap to open",
                                        color = subTextColor,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    } else {
                        Text(
                            text = msg.plainText,
                            color = textColor,
                            fontSize = 15.sp,
                            lineHeight = 20.sp
                        )
                    }

                    Spacer(Modifier.height(2.dp))
                    Row(
                        modifier = Modifier.align(Alignment.End),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        if (msg.starredByMe) {
                            Icon(Icons.Rounded.Star, null, tint = subTextColor, modifier = Modifier.size(11.dp))
                        }
                        if (msg.editedAt > 0L && !msg.isDeleted) {
                            Text("edited", fontSize = 10.sp, color = subTextColor)
                        }
                        Text(formatMsgTime(msg.ts), fontSize = 10.5.sp, color = subTextColor)
                        if (isMine && !msg.isDeleted) {
                            Icon(
                                imageVector = if (readCount > 1) Icons.Rounded.DoneAll else Icons.Rounded.Done,
                                contentDescription = null,
                                tint = if (readCount > 1) ZovioGreenTick else Color.White.copy(alpha = 0.78f),
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }

            if (reactions.isNotEmpty() && !msg.isDeleted) {
                Row(
                    modifier = Modifier.padding(top = 3.dp),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    reactions.forEach { (emoji, uids) ->
                        val mine = uids.contains(myUserId)
                        Surface(
                            shape = RoundedCornerShape(999.dp),
                            color = if (mine) ZovioBrand.copy(alpha = 0.25f) else MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier
                                .border(
                                    1.dp,
                                    if (mine) ZovioBrand else Color.Transparent,
                                    RoundedCornerShape(999.dp)
                                )
                                .clickable { onReactionTap(emoji) }
                        ) {
                            Text(
                                text = if (uids.size > 1) "$emoji ${uids.size}" else emoji,
                                fontSize = 12.sp,
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
            }
        }

        if (isSelectMode && isMine) {
            Icon(
                imageVector = if (isSelected) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked,
                contentDescription = null,
                tint = if (isSelected) ZovioBrand else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 8.dp).size(22.dp)
            )
        }
    }
}

private fun parseReactions(raw: String): List<Pair<String, List<String>>> {
    return runCatching {
        val obj = JSONObject(raw)
        val out = ArrayList<Pair<String, List<String>>>()
        val keys = obj.keys()
        while (keys.hasNext()) {
            val emoji = keys.next()
            val arr = obj.optJSONArray(emoji) ?: continue
            if (arr.length() == 0) continue
            val uids = (0 until arr.length()).map { arr.optString(it) }
            out.add(emoji to uids)
        }
        out
    }.getOrDefault(emptyList())
}

private fun shareFileOnly(context: Context, file: File, mimeType: String) {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = mimeType
        putExtra(Intent.EXTRA_STREAM, uri)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(Intent.createChooser(intent, "Share via"))
}

private fun shareOrOpenFile(context: Context, file: File, mimeHint: String?) {
    val ext = file.extension.lowercase()
    val mime = mimeHint
        ?: MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext)
        ?: "*/*"
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val viewIntent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, mime)
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    runCatching {
        context.startActivity(viewIntent)
    }.onFailure {
        shareFileOnly(context, file, mime)
    }
}

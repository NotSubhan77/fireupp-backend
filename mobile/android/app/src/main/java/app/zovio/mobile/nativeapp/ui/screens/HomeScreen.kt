package app.zovio.mobile.nativeapp.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.CallMade
import androidx.compose.material.icons.rounded.CallMissed
import androidx.compose.material.icons.rounded.CallReceived
import androidx.compose.material.icons.rounded.Campaign
import androidx.compose.material.icons.rounded.ChatBubble
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.DoneAll
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material.icons.rounded.PushPin
import androidx.compose.material.icons.rounded.RadioButtonChecked
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Videocam
import androidx.compose.material.icons.rounded.VolumeOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.zovio.mobile.nativeapp.data.db.CallHistoryEntity
import app.zovio.mobile.nativeapp.data.db.ChannelEntity
import app.zovio.mobile.nativeapp.data.db.ChatEntity
import app.zovio.mobile.nativeapp.data.db.StatusEntity
import app.zovio.mobile.nativeapp.data.db.UserCacheEntity
import app.zovio.mobile.nativeapp.data.prefs.ZovioSession
import app.zovio.mobile.nativeapp.ui.components.ZovioAvatar
import app.zovio.mobile.nativeapp.ui.components.formatChatListTime
import app.zovio.mobile.nativeapp.ui.theme.ZovioBrand
import app.zovio.mobile.nativeapp.ui.theme.ZovioDanger
import app.zovio.mobile.nativeapp.ui.theme.ZovioGreenTick
import app.zovio.mobile.nativeapp.ui.theme.ZovioOnline

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    session: ZovioSession,
    wsConnected: Boolean,
    chats: List<ChatEntity>,
    users: List<UserCacheEntity>,
    callHistory: List<CallHistoryEntity>,
    statuses: List<StatusEntity>,
    channels: List<ChannelEntity>,
    typingByChat: Map<String, String>,
    baseHttpUrl: String,
    onOpenChat: (String) -> Unit,
    onStartDm: (UserCacheEntity) -> Unit,
    onRefresh: () -> Unit,
    onToggleTheme: (Boolean) -> Unit,
    onOpenWebFallback: (routeView: String) -> Unit,
    onLogout: () -> Unit
) {
    var selectedTab by rememberSaveable { mutableIntStateOf(0) }
    var searchOpen by remember { mutableStateOf(false) }
    var searchQuery by remember { mutableStateOf("") }
    var showNewChatSheet by remember { mutableStateOf(false) }
    var showProfileSheet by remember { mutableStateOf(false) }

    val totalUnread = chats.sumOf { it.unread }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 1.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.statusBarsPadding()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(58.dp)
                            .padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = when (selectedTab) {
                                    0 -> "Zovio"
                                    1 -> "Calls"
                                    2 -> "Status"
                                    3 -> "Casts"
                                    else -> "Space"
                                },
                                fontSize = 22.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = MaterialTheme.colorScheme.onSurface
                            )
                            Text(
                                text = if (wsConnected) "Connected • End-to-End Encrypted" else "Syncing…",
                                fontSize = 11.sp,
                                color = if (wsConnected) ZovioOnline else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        if (selectedTab == 0) {
                            IconButton(onClick = { searchOpen = !searchOpen; if (!searchOpen) searchQuery = "" }) {
                                Icon(
                                    imageVector = if (searchOpen) Icons.Rounded.Close else Icons.Rounded.Search,
                                    contentDescription = "Search"
                                )
                            }
                        }

                        IconButton(onClick = onRefresh) {
                            Icon(Icons.Rounded.Refresh, contentDescription = "Refresh")
                        }

                        Box(
                            modifier = Modifier
                                .padding(start = 4.dp)
                                .clip(CircleShape)
                                .clickable { showProfileSheet = true }
                        ) {
                            ZovioAvatar(
                                name = session.name.ifBlank { session.username },
                                avatarUrl = session.avatar,
                                size = 34.dp,
                                baseHttpUrl = baseHttpUrl
                            )
                        }
                    }

                    if (searchOpen && selectedTab == 0) {
                        OutlinedTextField(
                            value = searchQuery,
                            onValueChange = { searchQuery = it },
                            placeholder = { Text("Search chats or messages…") },
                            singleLine = true,
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 14.dp, vertical = 8.dp)
                        )
                    }
                }
            }
        },
        floatingActionButton = {
            if (selectedTab == 0) {
                FloatingActionButton(
                    onClick = { showNewChatSheet = true },
                    containerColor = ZovioBrand,
                    contentColor = Color.White,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = "New Chat")
                }
            }
        },
        bottomBar = {
            NavigationBar(
                containerColor = MaterialTheme.colorScheme.surface,
                modifier = Modifier.navigationBarsPadding()
            ) {
                NavigationBarItem(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0 },
                    icon = { Icon(Icons.Rounded.ChatBubble, null) },
                    label = { Text(if (totalUnread > 0) "Chats ($totalUnread)" else "Chats", maxLines = 1) }
                )
                NavigationBarItem(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1 },
                    icon = { Icon(Icons.Rounded.Call, null) },
                    label = { Text("Calls", maxLines = 1) }
                )
                NavigationBarItem(
                    selected = selectedTab == 2,
                    onClick = { selectedTab = 2 },
                    icon = { Icon(Icons.Rounded.RadioButtonChecked, null) },
                    label = { Text("Status", maxLines = 1) }
                )
                NavigationBarItem(
                    selected = selectedTab == 3,
                    onClick = { selectedTab = 3 },
                    icon = { Icon(Icons.Rounded.Campaign, null) },
                    label = { Text("Casts", maxLines = 1) }
                )
                NavigationBarItem(
                    selected = selectedTab == 4,
                    onClick = { selectedTab = 4 },
                    icon = { Icon(Icons.Rounded.GridView, null) },
                    label = { Text("Space", maxLines = 1) }
                )
            }
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            when (selectedTab) {
                0 -> ChatsListTab(
                    chats = chats.filter {
                        searchQuery.isBlank() ||
                            it.name.contains(searchQuery, ignoreCase = true) ||
                            it.lastMsgPreview.contains(searchQuery, ignoreCase = true)
                    },
                    typingByChat = typingByChat,
                    baseHttpUrl = baseHttpUrl,
                    onOpenChat = onOpenChat
                )
                1 -> CallsTab(
                    calls = callHistory,
                    baseHttpUrl = baseHttpUrl,
                    onStartInstantMeet = { onOpenWebFallback("calls") }
                )
                2 -> StatusTab(
                    statuses = statuses,
                    baseHttpUrl = baseHttpUrl,
                    onOpenWebStatus = { onOpenWebFallback("stories") }
                )
                3 -> CastsTab(
                    channels = channels,
                    baseHttpUrl = baseHttpUrl,
                    onOpenChannelChat = onOpenChat,
                    onOpenWebCasts = { onOpenWebFallback("channels") }
                )
                4 -> SpaceTab(
                    onOpenWorkspace = { onOpenWebFallback("workspace") },
                    onOpenWhiteboard = { onOpenWebFallback("whiteboard") }
                )
            }
        }
    }

    if (showNewChatSheet) {
        ModalBottomSheet(onDismissRequest = { showNewChatSheet = false }) {
            var userQuery by remember { mutableStateOf("") }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Text("New Chat", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = userQuery,
                    onValueChange = { userQuery = it },
                    placeholder = { Text("Filter contacts by name or @username…") },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                )
                Spacer(Modifier.height(10.dp))
                LazyColumn(
                    modifier = Modifier.height(340.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    val filtered = users.filter {
                        it.id != session.userId && (
                            userQuery.isBlank() ||
                                it.name.contains(userQuery, ignoreCase = true) ||
                                it.username.contains(userQuery, ignoreCase = true)
                            )
                    }
                    items(filtered, key = { it.id }) { u ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .clickable {
                                    showNewChatSheet = false
                                    onStartDm(u)
                                }
                                .padding(horizontal = 8.dp, vertical = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            ZovioAvatar(
                                name = u.name,
                                avatarUrl = u.avatar,
                                colorHex = u.avatarColor,
                                size = 42.dp,
                                online = u.online,
                                baseHttpUrl = baseHttpUrl
                            )
                            Spacer(Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text(u.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("@${u.username}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }

    if (showProfileSheet) {
        ModalBottomSheet(onDismissRequest = { showProfileSheet = false }) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ZovioAvatar(
                        name = session.name.ifBlank { session.username },
                        avatarUrl = session.avatar,
                        size = 54.dp,
                        baseHttpUrl = baseHttpUrl
                    )
                    Spacer(Modifier.width(14.dp))
                    Column {
                        Text(session.name.ifBlank { "Zovio User" }, fontWeight = FontWeight.Bold, fontSize = 17.sp)
                        Text("@${session.username}", fontSize = 13.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        if (session.email.isNotBlank()) {
                            Text(session.email, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Icon(if (session.darkTheme) Icons.Rounded.DarkMode else Icons.Rounded.LightMode, null)
                        Text("Dark Theme", fontWeight = FontWeight.Medium)
                    }
                    Switch(
                        checked = session.darkTheme,
                        onCheckedChange = { onToggleTheme(it) }
                    )
                }
                Button(
                    onClick = {
                        showProfileSheet = false
                        onOpenWebFallback("settings")
                    },
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Open Full Web Settings / Backup")
                }
                Button(
                    onClick = {
                        showProfileSheet = false
                        onLogout()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = ZovioDanger),
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Rounded.Logout, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("Sign Out")
                }
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun ChatsListTab(
    chats: List<ChatEntity>,
    typingByChat: Map<String, String>,
    baseHttpUrl: String,
    onOpenChat: (String) -> Unit
) {
    if (chats.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                text = "No conversations yet. Tap + to start chatting!",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                fontSize = 14.sp
            )
        }
        return
    }
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(vertical = 4.dp)
    ) {
        items(chats, key = { it.id }) { chat ->
            val typingText = typingByChat[chat.id]
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onOpenChat(chat.id) }
                    .padding(horizontal = 16.dp, vertical = 11.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                ZovioAvatar(
                    name = chat.name,
                    avatarUrl = chat.avatar,
                    colorHex = chat.avatarColor,
                    size = 50.dp,
                    online = chat.type == "dm" && chat.peerOnline,
                    baseHttpUrl = baseHttpUrl
                )
                Spacer(Modifier.width(13.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.weight(1f)
                        ) {
                            Text(
                                text = chat.name,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.5.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (chat.isPinnedChat) {
                                Spacer(Modifier.width(5.dp))
                                Icon(
                                    Icons.Rounded.PushPin,
                                    contentDescription = "Pinned",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                            if (chat.isMuted) {
                                Spacer(Modifier.width(4.dp))
                                Icon(
                                    Icons.Rounded.VolumeOff,
                                    contentDescription = "Muted",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                        Spacer(Modifier.width(8.dp))
                        Text(
                            text = formatChatListTime(chat.updatedAt),
                            fontSize = 11.5.sp,
                            color = if (chat.unread > 0) ZovioBrand else MaterialTheme.colorScheme.onSurfaceVariant,
                            fontWeight = if (chat.unread > 0) FontWeight.Bold else FontWeight.Normal
                        )
                    }
                    Spacer(Modifier.height(3.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (chat.lastMsgFromMe && typingText == null) {
                            Icon(
                                Icons.Rounded.DoneAll,
                                contentDescription = null,
                                tint = ZovioGreenTick,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(Modifier.width(4.dp))
                        }
                        Text(
                            text = typingText ?: chat.lastMsgPreview.ifBlank { "Tap to open chat" },
                            fontSize = 13.5.sp,
                            color = if (typingText != null) ZovioOnline else MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.weight(1f)
                        )
                        if (chat.unread > 0) {
                            Spacer(Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .clip(CircleShape)
                                    .background(ZovioBrand)
                                    .padding(horizontal = 7.dp, vertical = 2.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = chat.unread.toString(),
                                    color = Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CallsTab(
    calls: List<CallHistoryEntity>,
    baseHttpUrl: String,
    onStartInstantMeet: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Surface(
            color = ZovioBrand.copy(alpha = 0.14f),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
                .clickable { onStartInstantMeet() }
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Rounded.Videocam, null, tint = ZovioBrand, modifier = Modifier.size(26.dp))
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("Voice / Video Call Room", fontWeight = FontWeight.Bold)
                    Text("Tap to launch WebRTC call, PiP & screen sharing", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(calls, key = { it.id }) { c ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onStartInstantMeet() }
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ZovioAvatar(name = c.peerName, avatarUrl = c.peerAvatar, size = 44.dp, baseHttpUrl = baseHttpUrl)
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(c.peerName, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            val missed = c.status == "missed" || c.status == "declined"
                            Icon(
                                imageVector = when {
                                    missed -> Icons.Rounded.CallMissed
                                    c.direction == "outgoing" -> Icons.Rounded.CallMade
                                    else -> Icons.Rounded.CallReceived
                                },
                                contentDescription = null,
                                tint = if (missed) ZovioDanger else ZovioGreenTick,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(Modifier.width(5.dp))
                            Text(
                                text = "${formatChatListTime(c.ts)} • ${c.mode}",
                                fontSize = 12.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    Icon(
                        if (c.mode == "video") Icons.Rounded.Videocam else Icons.Rounded.Call,
                        contentDescription = null,
                        tint = ZovioBrand
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusTab(
    statuses: List<StatusEntity>,
    baseHttpUrl: String,
    onOpenWebStatus: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        Surface(
            color = ZovioBrand.copy(alpha = 0.14f),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
                .clickable { onOpenWebStatus() }
        ) {
            Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.RadioButtonChecked, null, tint = ZovioBrand, modifier = Modifier.size(26.dp))
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("Create or View Stories", fontWeight = FontWeight.Bold)
                    Text("24-hour status updates with gesture editor", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(statuses, key = { it.id }) { s ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenWebStatus() }
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ZovioAvatar(name = s.userName, avatarUrl = s.userAvatar, size = 46.dp, baseHttpUrl = baseHttpUrl)
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(s.userName, fontWeight = FontWeight.Bold)
                        Text(
                            text = s.text.ifBlank { if (s.kind == "text") "Text status" else "Media status" },
                            fontSize = 12.5.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                    Text(formatChatListTime(s.createdAt), fontSize = 11.5.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun CastsTab(
    channels: List<ChannelEntity>,
    baseHttpUrl: String,
    onOpenChannelChat: (String) -> Unit,
    onOpenWebCasts: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(modifier = Modifier.weight(1f)) {
            items(channels, key = { it.id }) { c ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenChannelChat(c.id) }
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    ZovioAvatar(
                        name = c.name,
                        avatarUrl = c.avatar,
                        colorHex = c.avatarColor,
                        size = 46.dp,
                        baseHttpUrl = baseHttpUrl
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(c.name, fontWeight = FontWeight.Bold)
                        Text(
                            text = "@${c.handle} • ${c.followerCount} followers",
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            }
        }
        Button(
            onClick = onOpenWebCasts,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp)
        ) {
            Text("Discover / Create Channels")
        }
    }
}

@Composable
private fun SpaceTab(
    onOpenWorkspace: () -> Unit,
    onOpenWhiteboard: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        Text("ZovioSpace", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
        Text(
            text = "Whiteboard, Notes, Tasks and Calendar are migrating natively in Phase 3. Open live workspace right here:",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 13.5.sp
        )
        Button(
            onClick = onOpenWhiteboard,
            colors = ButtonDefaults.buttonColors(containerColor = ZovioBrand),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text("Open Whiteboard", fontWeight = FontWeight.Bold)
        }
        Button(
            onClick = onOpenWorkspace,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier.fillMaxWidth().height(50.dp)
        ) {
            Text("Open Notes, Tasks & Calendar", fontWeight = FontWeight.SemiBold)
        }
    }
}

package app.zovio.mobile.nativeapp.data.db

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "chats")
data class ChatEntity(
    @PrimaryKey val id: String,
    val type: String, // "dm" | "group" | "channel" | "self"
    val name: String,
    val description: String = "",
    val avatar: String? = null,
    val avatarColor: String = "#7C5CFF",
    val ownerId: String = "",
    val isPinnedChat: Boolean = false,
    val isMuted: Boolean = false,
    val isAccepted: Boolean = true,
    val unread: Int = 0,
    val updatedAt: Long = 0L,
    val lastMsgPreview: String = "",
    val lastMsgSender: String = "",
    val lastMsgTs: Long = 0L,
    val lastMsgKind: String = "",
    val lastMsgFromMe: Boolean = false,
    val pinnedMessageId: String? = null,
    val keyVersion: Int = 1,
    val keysJson: String = "{}",
    val membersJson: String = "[]",
    val peerUserId: String = "",
    val peerName: String = "",
    val peerUsername: String = "",
    val peerAvatar: String? = null,
    val peerOnline: Boolean = false,
    val peerLastSeen: Long = 0L,
    val peerPublicKey: String? = null,
    val rawJson: String = "{}"
)

@Entity(
    tableName = "messages",
    indices = [
        Index(value = ["chatId", "ts"]),
        Index(value = ["chatId", "starredByMe"])
    ]
)
data class MessageEntity(
    @PrimaryKey val id: String,
    val chatId: String,
    val senderId: String,
    val senderName: String = "",
    val ts: Long,
    val kind: String, // text, image, video, audio, file, call, location, live, poll, todo, gif, sticker, system
    val plainText: String = "",
    val payloadJson: String = "{}",
    val mediaUrl: String? = null,
    val localMediaPath: String? = null,
    val fileId: String? = null,
    val fileKey: String? = null,
    val fileChunks: Int = 1,
    val fileName: String? = null,
    val mimeType: String? = null,
    val fileSize: Long = 0L,
    val replyToId: String? = null,
    val replySender: String? = null,
    val replyPreview: String? = null,
    val reactionsJson: String = "{}",
    val readByJson: String = "[]",
    val editedAt: Long = 0L,
    val starredByMe: Boolean = false,
    val isDeleted: Boolean = false,
    val forwardedFrom: String? = null,
    val viewOnce: Boolean = false,
    val localStatus: String = "sent", // "sending" | "sent" | "failed"
    val rawJson: String = "{}"
)

@Entity(tableName = "users_cache")
data class UserCacheEntity(
    @PrimaryKey val id: String,
    val username: String = "",
    val name: String = "",
    val bio: String = "",
    val avatar: String? = null,
    val avatarColor: String = "#7C5CFF",
    val online: Boolean = false,
    val lastSeen: Long = 0L,
    val publicKey: String? = null,
    val isFriend: Boolean = false,
    val rawJson: String = "{}"
)

@Entity(tableName = "call_history")
data class CallHistoryEntity(
    @PrimaryKey val id: String,
    val callerId: String = "",
    val peerName: String = "",
    val peerAvatar: String? = null,
    val mode: String = "audio", // audio | video
    val direction: String = "incoming", // incoming | outgoing
    val status: String = "completed", // completed | missed | declined
    val durationSec: Int = 0,
    val ts: Long = 0L,
    val chatId: String? = null,
    val rawJson: String = "{}"
)

@Entity(tableName = "statuses")
data class StatusEntity(
    @PrimaryKey val id: String,
    val userId: String = "",
    val userName: String = "",
    val userAvatar: String? = null,
    val kind: String = "text",
    val text: String = "",
    val bgColor: String = "#7C5CFF",
    val mediaUrl: String? = null,
    val createdAt: Long = 0L,
    val expiresAt: Long = 0L,
    val viewedByMe: Boolean = false,
    val viewsCount: Int = 0,
    val rawJson: String = "{}"
)

@Entity(tableName = "channels")
data class ChannelEntity(
    @PrimaryKey val id: String,
    val name: String = "",
    val handle: String = "",
    val description: String = "",
    val avatar: String? = null,
    val avatarColor: String = "#7C5CFF",
    val followerCount: Int = 0,
    val isFollowing: Boolean = false,
    val isAdmin: Boolean = false,
    val updatedAt: Long = 0L,
    val rawJson: String = "{}"
)

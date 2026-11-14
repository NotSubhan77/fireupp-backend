package app.zovio.mobile.nativeapp.data.db

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ZovioDao {

    // ---- Chats ----
    @Query("SELECT * FROM chats ORDER BY isPinnedChat DESC, updatedAt DESC")
    fun observeChats(): Flow<List<ChatEntity>>

    @Query("SELECT * FROM chats WHERE id = :chatId LIMIT 1")
    fun observeChat(chatId: String): Flow<ChatEntity?>

    @Query("SELECT * FROM chats WHERE id = :chatId LIMIT 1")
    suspend fun getChat(chatId: String): ChatEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertChats(chats: List<ChatEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertChat(chat: ChatEntity)

    @Query("DELETE FROM chats WHERE id = :chatId")
    suspend fun deleteChat(chatId: String)

    @Query("UPDATE chats SET unread = 0 WHERE id = :chatId")
    suspend fun clearUnread(chatId: String)

    @Query("UPDATE chats SET peerOnline = :online, peerLastSeen = :lastSeen WHERE peerUserId = :userId")
    suspend fun updatePeerPresence(userId: String, online: Boolean, lastSeen: Long)

    // ---- Messages (ordered newest-first for LazyColumn(reverseLayout = true)) ----
    @Query("SELECT * FROM messages WHERE chatId = :chatId ORDER BY ts DESC")
    fun observeMessagesDesc(chatId: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE chatId = :chatId ORDER BY ts ASC")
    suspend fun getMessagesAsc(chatId: String): List<MessageEntity>

    @Query("SELECT * FROM messages WHERE id = :msgId LIMIT 1")
    suspend fun getMessage(msgId: String): MessageEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMessages(messages: List<MessageEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertMessage(message: MessageEntity)

    @Query("DELETE FROM messages WHERE id = :msgId")
    suspend fun deleteMessageById(msgId: String)

    @Query("DELETE FROM messages WHERE chatId = :chatId")
    suspend fun clearChatMessages(chatId: String)

    @Query("UPDATE messages SET localMediaPath = :localPath WHERE id = :msgId")
    suspend fun updateLocalMediaPath(msgId: String, localPath: String)

    // ---- Users ----
    @Query("SELECT * FROM users_cache ORDER BY name ASC")
    fun observeUsers(): Flow<List<UserCacheEntity>>

    @Query("SELECT * FROM users_cache WHERE id = :uid LIMIT 1")
    suspend fun getUser(uid: String): UserCacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertUsers(users: List<UserCacheEntity>)

    @Query("UPDATE users_cache SET online = :online, lastSeen = :lastSeen WHERE id = :userId")
    suspend fun updateUserPresence(userId: String, online: Boolean, lastSeen: Long)

    // ---- Calls / Statuses / Channels ----
    @Query("SELECT * FROM call_history ORDER BY ts DESC")
    fun observeCallHistory(): Flow<List<CallHistoryEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertCallHistory(items: List<CallHistoryEntity>)

    @Query("DELETE FROM call_history")
    suspend fun clearCallHistory()

    @Query("SELECT * FROM statuses ORDER BY createdAt DESC")
    fun observeStatuses(): Flow<List<StatusEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertStatuses(items: List<StatusEntity>)

    @Query("DELETE FROM statuses")
    suspend fun clearStatuses()

    @Query("SELECT * FROM channels ORDER BY updatedAt DESC")
    fun observeChannels(): Flow<List<ChannelEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertChannels(items: List<ChannelEntity>)

    @Query("DELETE FROM channels")
    suspend fun clearChannels()

    @Query("DELETE FROM chats")
    suspend fun clearAllChats()

    @Query("DELETE FROM messages")
    suspend fun clearAllMessages()

    @Query("DELETE FROM users_cache")
    suspend fun clearAllUsers()
}

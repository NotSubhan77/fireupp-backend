package app.zovio.mobile.nativeapp.data.db

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        ChatEntity::class,
        MessageEntity::class,
        UserCacheEntity::class,
        CallHistoryEntity::class,
        StatusEntity::class,
        ChannelEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class ZovioDatabase : RoomDatabase() {
    abstract fun dao(): ZovioDao

    companion object {
        @Volatile
        private var INSTANCE: ZovioDatabase? = null

        fun get(context: Context): ZovioDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    ZovioDatabase::class.java,
                    "zovio_native_db.sqlite"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}

package app.zovio.mobile.nativeapp.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.zovio.mobile.nativeapp.ui.theme.ZovioBrand
import app.zovio.mobile.nativeapp.ui.theme.ZovioCyan
import app.zovio.mobile.nativeapp.ui.theme.ZovioOnline
import coil.compose.AsyncImage
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun ZovioAvatar(
    name: String,
    avatarUrl: String?,
    colorHex: String = "#7C5CFF",
    size: Dp = 48.dp,
    online: Boolean = false,
    baseHttpUrl: String = "https://fireupp.up.railway.app"
) {
    val bgColor = runCatching {
        Color(android.graphics.Color.parseColor(colorHex))
    }.getOrElse { ZovioBrand }

    val resolvedUrl = avatarUrl?.takeIf { it.isNotBlank() && it != "null" }?.let { raw ->
        if (raw.startsWith("http") || raw.startsWith("data:")) raw else "${baseHttpUrl.trimEnd('/')}$raw"
    }

    val initials = name.trim()
        .split(Regex("\\s+"))
        .filter { it.isNotEmpty() }
        .take(2)
        .joinToString("") { it.first().uppercaseChar().toString() }
        .ifEmpty { "Z" }

    Box(modifier = Modifier.size(size)) {
        if (resolvedUrl != null) {
            AsyncImage(
                model = resolvedUrl,
                contentDescription = name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(bgColor.copy(alpha = 0.25f))
            )
        } else {
            Box(
                modifier = Modifier
                    .size(size)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(
                            listOf(bgColor, ZovioCyan.copy(alpha = 0.85f))
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = initials,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = (size.value * 0.36f).sp
                )
            }
        }

        if (online) {
            Box(
                modifier = Modifier
                    .size(13.dp)
                    .align(Alignment.BottomEnd)
                    .clip(CircleShape)
                    .background(ZovioOnline)
                    .border(2.dp, MaterialTheme.colorScheme.background, CircleShape)
            )
        }
    }
}

fun formatMsgTime(ts: Long): String {
    if (ts <= 0L) return ""
    return SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date(ts)).lowercase(Locale.getDefault())
}

fun formatChatListTime(ts: Long): String {
    if (ts <= 0L) return ""
    val calNow = Calendar.getInstance()
    val calTs = Calendar.getInstance().apply { timeInMillis = ts }
    val sameDay = calNow.get(Calendar.YEAR) == calTs.get(Calendar.YEAR) &&
        calNow.get(Calendar.DAY_OF_YEAR) == calTs.get(Calendar.DAY_OF_YEAR)
    return if (sameDay) {
        formatMsgTime(ts)
    } else {
        SimpleDateFormat("d MMM", Locale.getDefault()).format(Date(ts))
    }
}

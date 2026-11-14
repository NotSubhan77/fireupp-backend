package app.zovio.mobile.nativeapp.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val ZovioBrand = Color(0xFF7C5CFF)
val ZovioBrandDark = Color(0xFF5B3CE0)
val ZovioCyan = Color(0xFF06B6D4)
val ZovioGreenTick = Color(0xFF34D399)
val ZovioOnline = Color(0xFF22C55E)
val ZovioDanger = Color(0xFFEF4444)

private val DarkPalette = darkColorScheme(
    primary = ZovioBrand,
    onPrimary = Color.White,
    secondary = ZovioCyan,
    onSecondary = Color.White,
    background = Color(0xFF0A0D18),
    onBackground = Color(0xFFF1F5F9),
    surface = Color(0xFF101424),
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = Color(0xFF181E34),
    onSurfaceVariant = Color(0xFF94A3B8),
    outline = Color(0xFF28304D),
    error = ZovioDanger
)

private val LightPalette = lightColorScheme(
    primary = ZovioBrandDark,
    onPrimary = Color.White,
    secondary = ZovioCyan,
    onSecondary = Color.White,
    background = Color(0xFFF4F6FB),
    onBackground = Color(0xFF0F172A),
    surface = Color(0xFFFFFFFF),
    onSurface = Color(0xFF0F172A),
    surfaceVariant = Color(0xFFE9EEF8),
    onSurfaceVariant = Color(0xFF475569),
    outline = Color(0xFFCBD5E1),
    error = ZovioDanger
)

@Composable
fun ZovioTheme(
    darkTheme: Boolean = true,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkPalette else LightPalette,
        content = content
    )
}

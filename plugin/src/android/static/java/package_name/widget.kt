// widget.kt
package {{PACKAGE_NAME}}

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import android.util.Log

@Serializable
private data class {{WIDGET_NAME}}_Plug(
    val plugged: Boolean,
    val inUse: Boolean
) {
    fun getStatusColor(): androidx.glance.unit.ColorProvider {
        return androidx.glance.unit.ColorProvider(
            when (plugged to inUse) {
                false to false -> androidx.compose.ui.graphics.Color(0xFF4CAF50) // GREEN
                true to false -> androidx.compose.ui.graphics.Color(0xFFFFC107) // YELLOW
                true to true -> androidx.compose.ui.graphics.Color(0xFFF44336) // RED
                else -> androidx.compose.ui.graphics.Color(0xFF9E9E9E) // GRAY
            }
        )
    }
}

@Serializable
private data class {{WIDGET_NAME}}_Device(
    val id: String,
    val plugs: List<{{WIDGET_NAME}}_Plug>
)

class {{WIDGET_NAME}}_Widget : GlanceAppWidget() {
    
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        try {
            // Fetch data first
            val devices = {{WIDGET_NAME}}_DeviceDataManager.shared.fetchDevices()
            val stationName = {{WIDGET_NAME}}_getItem(context, "savedData", "{{GROUP_IDENTIFIER}}") ?: ""
            
            Log.d("{{WIDGET_NAME}}", "provideGlance - Station: $stationName, Devices: ${devices.size}")
            
            provideContent {
                try {
                    if (stationName.trim().isEmpty()) {
                        NoFavoriteContent(context)
                    } else {
                        WidgetContent(context, stationName.trim(), devices)
                    }
                } catch (e: Exception) {
                    Log.e("{{WIDGET_NAME}}", "Error in provideContent", e)
                    ErrorContent(e.message ?: "Unknown error")
                }
            }
        } catch (e: Exception) {
            Log.e("{{WIDGET_NAME}}", "Error in provideGlance", e)
            provideContent {
                ErrorContent(e.message ?: "Unknown error")
            }
        }
    }
    
    @Composable
    private fun ErrorContent(message: String) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(8.dp)
                .background(androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFFFFEBEE))),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Error",
                style = TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFFD32F2F))
                )
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            Text(
                text = message,
                style = TextStyle(
                    fontSize = 10.sp,
                    color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFF777777))
                )
            )
        }
    }

    @Composable
    private fun NoFavoriteContent(context: Context) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(8.dp)
                .background(androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color.White))
                .cornerRadius(16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "No Favorite Station",
                style = TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFF222222))
                )
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            Text(
                text = "Please set a favorite station in the app",
                style = TextStyle(
                    fontSize = 10.sp,
                    color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFF777777))
                )
            )
        }
    }

    @Composable
    private fun WidgetContent(context: Context, stationName: String, devices: List<{{WIDGET_NAME}}_Device>) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(8.dp)
                .background(androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color.White))
                .cornerRadius(16.dp)
        ) {
            // Header
            Column(modifier = GlanceModifier.padding(4.dp)) {
                Text(
                    text = stationName,
                    style = TextStyle(
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFF222222))
                    )
                )
                Spacer(modifier = GlanceModifier.height(2.dp))
                Text(
                    text = "Device Status",
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFF777777))
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Devices Grid
            DevicesGrid(devices)

            Spacer(modifier = GlanceModifier.defaultWeight())

            // Footer
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
                Text(
                    text = "Updated: ${timeFormat.format(Date())}",
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFF808080))
                    ),
                    modifier = GlanceModifier.defaultWeight()
                )
                
                Image(
                    provider = ImageProvider(android.R.drawable.ic_popup_sync),
                    contentDescription = "Refresh",
                    modifier = GlanceModifier
                        .size(24.dp)
                        .clickable(actionRunCallback<{{WIDGET_NAME}}_RefreshAction>())
                )
            }
        }
    }

    @Composable
    private fun DevicesGrid(devices: List<{{WIDGET_NAME}}_Device>) {
        if (devices.isEmpty()) {
            Column(
                modifier = GlanceModifier.fillMaxWidth().padding(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "No devices found",
                    style = TextStyle(
                        fontSize = 12.sp,
                        color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFF777777))
                    )
                )
            }
        } else {
            Column(modifier = GlanceModifier.fillMaxWidth()) {
                devices.take(6).chunked(2).forEach { devicePair ->
                    Row(
                        modifier = GlanceModifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Horizontal.Start
                    ) {
                        devicePair.forEach { device ->
                            DeviceCard(device, modifier = GlanceModifier.defaultWeight())
                        }
                        if (devicePair.size == 1) {
                            Spacer(modifier = GlanceModifier.defaultWeight())
                        }
                    }
                    Spacer(modifier = GlanceModifier.height(4.dp))
                }
            }
        }
    }

    @Composable
    private fun DeviceCard(device: {{WIDGET_NAME}}_Device, modifier: GlanceModifier) {
        Column(
            modifier = modifier
                .padding(4.dp)
                .background(androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFFF5F5F5)))
                .cornerRadius(8.dp)
                .padding(6.dp)
        ) {
            Text(
                text = device.id,
                style = TextStyle(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color.Black)
                )
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(androidx.glance.unit.ColorProvider(androidx.compose.ui.graphics.Color(0xFFF5F5F5)))
                    .padding(4.dp)
            ) {
                device.plugs.take(4).forEach { plug ->
                    Box(
                        modifier = GlanceModifier
                            .size(24.dp)
                            .padding(2.dp)
                            .background(plug.getStatusColor())
                            .cornerRadius(4.dp),
                        contentAlignment = Alignment.Center
                    ) {}
                }
            }
        }
    }
}

class {{WIDGET_NAME}}_RefreshAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        Log.d("{{WIDGET_NAME}}", "RefreshAction triggered")
        {{WIDGET_NAME}}_Widget().update(context, glanceId)
    }
}

class {{WIDGET_NAME}} : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = {{WIDGET_NAME}}_Widget()

    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d("{{WIDGET_NAME}}", "onUpdate called for ${appWidgetIds.size} widgets")
        super.onUpdate(context, appWidgetManager, appWidgetIds)
    }
    
    override fun onEnabled(context: Context) {
        super.onEnabled(context)
        Log.d("{{WIDGET_NAME}}", "Widget enabled")
    }
}

private fun {{WIDGET_NAME}}_getItem(
    context: Context,
    key: String,
    preferenceName: String
): String? {
    val preferences = context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
    val value = preferences.getString(key, null)
    Log.d("{{WIDGET_NAME}}", "getItem - key: $key, value: $value")
    return value
}

private class {{WIDGET_NAME}}_DeviceDataManager private constructor() {
    private val TAG = "{{WIDGET_NAME}}_DataMgr"
    private val apiUrl = "http://10.0.2.2:3000/devices"

    suspend fun fetchDevices(): List<{{WIDGET_NAME}}_Device> {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Fetching devices from $apiUrl")
                val url = URL(apiUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.requestMethod = "GET"

                val responseCode = connection.responseCode
                Log.d(TAG, "Response code: $responseCode")
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    Log.d(TAG, "Response: $response")
                    
                    try {
                        val jsonObject = Json { ignoreUnknownKeys = true }
                            .decodeFromString<Map<String, List<{{WIDGET_NAME}}_Device>>>(response)
                        val devices = jsonObject["devices"] ?: emptyList()
                        Log.d(TAG, "Parsed ${devices.size} devices from wrapped JSON")
                        devices
                    } catch (e: Exception) {
                        Log.d(TAG, "Trying direct array parsing")
                        val devices = Json { ignoreUnknownKeys = true }
                            .decodeFromString<List<{{WIDGET_NAME}}_Device>>(response)
                        Log.d(TAG, "Parsed ${devices.size} devices from direct array")
                        devices
                    }
                } else {
                    Log.e(TAG, "HTTP error: $responseCode")
                    emptyList()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching devices", e)
                emptyList()
            }
        }
    }

    companion object {
        val shared = {{WIDGET_NAME}}_DeviceDataManager()
    }
}
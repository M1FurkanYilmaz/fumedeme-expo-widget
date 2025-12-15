// widget.kt
package expo.modules.fumedemeexpowidget.example

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.os.Bundle
import android.content.Intent
import android.util.Log
import android.view.View
import android.widget.RemoteViews
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.withContext
import kotlinx.serialization.decodeFromString
import kotlinx.serialization.json.Json
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.serialization.Serializable


@Serializable
data class Plug(
    val plugged: Boolean,
    val inUse: Boolean
) {
    fun getStatusColor(): Int {
        return when (plugged to inUse) {
            false to false -> android.graphics.Color.GREEN
            true to false -> android.graphics.Color.YELLOW
            true to true -> android.graphics.Color.RED
            false to true -> android.graphics.Color.GRAY
            else -> android.graphics.Color.GRAY
        }
    }
}

@Serializable
data class Device(
    val id: String,
    val plugs: List<Plug>
)

class DenemeHavaWidget : AppWidgetProvider() {
    private val TAG = "DenemeHavaWidget"
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d(TAG, "onUpdate called for ${appWidgetIds.size} widgets")
        
        // Set up the refresh button for each widget
        for (appWidgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, R.layout.denemehavawidget)
            
            // Create refresh intent
            val refreshIntent = Intent(context, DenemeHavaWidget::class.java)
            refreshIntent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            refreshIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
            val pendingIntent = PendingIntent.getBroadcast(
                context, 
                appWidgetId, 
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.refreshButton, pendingIntent)
            
            // Update the widget initially with the refresh button
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
        
        // Now fetch data and update content
        fetchDataAndUpdateWidgets(context, appWidgetManager, appWidgetIds)
    }
    
    private fun fetchDataAndUpdateWidgets(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        CoroutineScope(Dispatchers.Main).launch {
            val stationName =
                (getItem(context, "savedData", "group.expo.modules.havadeneme.example") ?: "").trim()

            if (stationName.isEmpty()) {
                Log.d(TAG, "Favori istasyon bulunamadı, kullanıcıya uyarı gösteriliyor.")
                for (appWidgetId in appWidgetIds) {
                    showNoFavoriteState(context, appWidgetManager, appWidgetId)
                }
                return@launch
            }

            try {
                Log.d(TAG, "Uygulamadan alınan istasyon adı: $stationName")
                val devices = DeviceDataManager.shared.fetchDevices()
                Log.d(TAG, "Fetched ${devices.size} devices")
                Log.d(TAG, "Fetched ${devices} devices")

                for (appWidgetId in appWidgetIds) {
                    updateWidgetContent(context, appWidgetManager, appWidgetId, devices, stationName)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching device data", e)
                // Update widgets with error state
                for (appWidgetId in appWidgetIds) {
                    val errorViews =
                        RemoteViews(context.packageName, R.layout.denemehavawidget)
                    errorViews.setTextViewText(R.id.lastUpdated, "Error: Cannot load data")
                    appWidgetManager.updateAppWidget(appWidgetId, errorViews)
                }
            }
        }
    }
    
    private fun updateWidgetContent(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        devices: List<Device>,
        stationName: String
    ) {
        try {
            val widgetSize = getWidgetSize(appWidgetManager, appWidgetId)
            val views = RemoteViews(context.packageName, R.layout.denemehavawidget)

            // Başlıkta istasyon adını göster; boşsa varsayılan başlığı kullan
            val title =
                if (stationName.isNotEmpty()) stationName else context.getString(R.string.app_name)
            views.setTextViewText(R.id.widgetTitle, title)
            views.setTextViewText(
                R.id.widgetSubtitle,
                context.getString(R.string.widget_subtitle)
            )
            
            // Determine how many devices to show based on widget size
            val deviceLimit = when (widgetSize) {
                WidgetSize.SMALL -> 2
                WidgetSize.MEDIUM -> 4
                WidgetSize.LARGE -> 6
            }
            
            // Hide all device views initially
            for (i in 1..6) {
                views.setViewVisibility(context.resources.getIdentifier("device$i", "id", context.packageName), View.GONE)
            }
            
            // Show and update devices based on data
            val limitedDevices = devices.take(deviceLimit)
            limitedDevices.forEachIndexed { index, device ->
                val deviceViewId = context.resources.getIdentifier("device${index + 1}", "id", context.packageName)
                val deviceTextId = context.resources.getIdentifier("deviceId${index + 1}", "id", context.packageName)
                
                Log.d(TAG, "Updating device ${index + 1}: ${device.id} with ${device.plugs.size} plugs")
                Log.d(TAG, "View IDs - device: $deviceViewId, deviceText: $deviceTextId")

                // Make device view visible and set the device ID text
                views.setViewVisibility(deviceViewId, View.VISIBLE)
                views.setTextViewText(deviceTextId, device.id)

                
                // Update plug status indicators
                val maxPlugs = 4 // Max plugs per device in our layout
                
                // Hide all plugs first
                for (plugIdx in 1..maxPlugs) {
                    val plugViewId = context.resources.getIdentifier(
                        "plug${index + 1}_$plugIdx", 
                        "id", 
                        context.packageName
                    )
                    views.setViewVisibility(plugViewId, View.GONE)
                }
                
                // Show and update available plugs
                device.plugs.forEachIndexed { plugIdx, plug ->
                    if (plugIdx < maxPlugs) {
                        val plugViewId = context.resources.getIdentifier(
                            "plug${index + 1}_${plugIdx + 1}", 
                            "id", 
                            context.packageName
                        )
                        
                        views.setViewVisibility(plugViewId, View.VISIBLE)
                        views.setInt(plugViewId, "setBackgroundColor", plug.getStatusColor())
                    }
                }
            }
            
            // Update last updated timestamp
            val timeFormat = SimpleDateFormat("HH:mm", Locale.getDefault())
            views.setTextViewText(R.id.lastUpdated, "Last updated: ${timeFormat.format(Date())}")
            
            // Update widget
            appWidgetManager.updateAppWidget(appWidgetId, views)
            Log.d(TAG, "DenemeHavaWidget $appWidgetId updated with ${limitedDevices.size} devices")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error updating DenemeHavaWidget $appWidgetId", e)
        }
    }

    private fun showNoFavoriteState(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        val views = RemoteViews(context.packageName, R.layout.denemehavawidget)
        views.setTextViewText(
            R.id.widgetTitle,
            context.getString(R.string.no_favorite_station_title)
        )
        views.setTextViewText(
            R.id.widgetSubtitle,
            context.getString(R.string.no_favorite_station_message)
        )
        views.setTextViewText(
            R.id.lastUpdated,
            context.getString(R.string.no_favorite_station_last_updated)
        )

        for (i in 1..6) {
            val deviceId = context.resources.getIdentifier("device$i", "id", context.packageName)
            if (deviceId != 0) {
                views.setViewVisibility(deviceId, View.GONE)
            }
        }

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun getWidgetSize(appWidgetManager: AppWidgetManager, appWidgetId: Int): WidgetSize {
        val options = appWidgetManager.getAppWidgetOptions(appWidgetId)
        val width = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
        val height = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT)

        // Hem en hem boyu dikkate alarak yaklaşık bir "yoğunluk" hesabı yapıyoruz.
        // Böylece çok geniş ama alçak ya da çok yüksek ama dar widget'larda gereğinden
        // fazla/az cihaz göstermeyip boşluk hissini azaltıyoruz.
        return when {
            width < 140 || height < 80 -> WidgetSize.SMALL
            width < 260 || height < 150 -> WidgetSize.MEDIUM
            else -> WidgetSize.LARGE
        }
    }
    
    enum class WidgetSize {
        SMALL, MEDIUM, LARGE
    }
    
    // Handle widget resize
    override fun onAppWidgetOptionsChanged(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int,
        newOptions: Bundle
    ) {
        fetchDataAndUpdateWidgets(context, appWidgetManager, intArrayOf(appWidgetId))
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions)
    }
}

internal fun getItem(
    context: Context,
    key: String,
    preferenceName: String
): String? {
    val preferences = context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
    return preferences.getString(key, null)
}

class DeviceDataManager private constructor() {
    private val TAG = "DeviceDataManager"
    private val apiUrl = "http://10.0.2.2:3000/devices"
    
    suspend fun fetchDevices(): List<Device> {
        return withContext(Dispatchers.IO) {
            try {
                Log.d(TAG, "Starting fetch from $apiUrl")
                val url = URL(apiUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 5000
                connection.readTimeout = 5000
                connection.requestMethod = "GET"
                
                val responseCode = connection.responseCode
                Log.d(TAG, "HTTP response code: $responseCode")
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val inputStream = connection.inputStream
                    val response = inputStream.bufferedReader().use { it.readText() }
                    Log.d(TAG, "Raw response: $response")
                    
                    try {
                        // First try parsing as a wrapped object with "devices" key
                        val jsonObject = Json { ignoreUnknownKeys = true }.decodeFromString<Map<String, List<Device>>>(response)
                        val devices = jsonObject["devices"] ?: emptyList()
                        Log.d(TAG, "Parsed ${devices.size} devices from wrapped JSON")
                        return@withContext devices
                    } catch (e: Exception) {
                        Log.d(TAG, "Failed to parse as wrapped object, trying direct array")
                        
                        // If that fails, try parsing as a direct array
                        try {
                            val devices = Json { ignoreUnknownKeys = true }.decodeFromString<List<Device>>(response)
                            Log.d(TAG, "Parsed ${devices.size} devices from direct JSON array")
                            return@withContext devices
                        } catch (e2: Exception) {
                            Log.e(TAG, "JSON parsing error: ${e2.message}")
                            return@withContext emptyList()
                        }
                    }
                } else {
                    Log.e(TAG, "HTTP error: $responseCode")
                    return@withContext emptyList()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Network error: ${e.message}")
                e.printStackTrace()
                return@withContext emptyList()
            }
        }
    }
    
    companion object {
        val shared = DeviceDataManager()
    }
}
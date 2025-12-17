// widget.kt
package expo.modules.fumedemeexpowidget.example

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import androidx.glance.unit.ColorProvider
import androidx.glance.action.ActionParameters
import androidx.glance.action.clickable
import androidx.glance.currentState
import androidx.glance.state.GlanceStateDefinition
import androidx.glance.state.PreferencesGlanceStateDefinition
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.stringPreferencesKey
import android.util.Log
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.action.ActionCallback
import kotlinx.coroutines.MainScope
import kotlinx.coroutines.launch

// Define state keys
object ExampleWeatherWidgetStateKeys {
    val DATA_KEY = stringPreferencesKey("widget_data")
    val LAST_UPDATE = stringPreferencesKey("last_update")
}

class ExampleWeatherWidget_Widget : GlanceAppWidget() {
    
    // Use PreferencesGlanceStateDefinition for state management
    override val stateDefinition: GlanceStateDefinition<*> = PreferencesGlanceStateDefinition
    
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            ExampleWeatherWidgetContent(context)
        }
    }
}

@Composable
fun ExampleWeatherWidgetContent(context: Context) {
    // Access current state
    val prefs = currentState<Preferences>()
    val data = prefs[ExampleWeatherWidgetStateKeys.DATA_KEY] ?: "No data yet"
    val lastUpdate = prefs[ExampleWeatherWidgetStateKeys.LAST_UPDATE] ?: ""
    
    Log.d("ExampleWeatherWidget", "Composing widget with data: $data")
    
    Column(
        modifier = GlanceModifier
            .fillMaxSize()
            .padding(16.dp)
            .background(ColorProvider(Color.White))
            .cornerRadius(16.dp),
        verticalAlignment = Alignment.Vertical.CenterVertically,
        horizontalAlignment = Alignment.Horizontal.CenterHorizontally
    ) {
        Text(
            text = "ExampleWeatherWidget",
            style = TextStyle(
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(Color(0xFF2196F3))
            )
        )
        
        Spacer(modifier = GlanceModifier.height(16.dp))
        
        Text(
            text = "Data received from app:",
            style = TextStyle(
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = ColorProvider(Color(0xFF666666))
            )
        )
        
        Spacer(modifier = GlanceModifier.height(8.dp))
        
        val displayColor = if (data != "No data yet") Color(0xFF4CAF50) else Color(0xFF999999)
        
        Text(
            text = data,
            style = TextStyle(
                fontSize = 14.sp,
                fontWeight = FontWeight.Normal,
                color = ColorProvider(displayColor)
            )
        )
        
        if (lastUpdate.isNotEmpty()) {
            Spacer(modifier = GlanceModifier.height(8.dp))
            Text(
                text = "Updated: $lastUpdate",
                style = TextStyle(
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Normal,
                    color = ColorProvider(Color(0xFFAAAAAA))
                )
            )
        }
        
        // Optional: Add a refresh button
        Spacer(modifier = GlanceModifier.height(16.dp))
        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalAlignment = Alignment.Horizontal.CenterHorizontally
        ) {
            Box(
                modifier = GlanceModifier
                    .background(ColorProvider(Color(0xFF2196F3)))
                    .cornerRadius(8.dp)
                    .padding(horizontal = 16.dp, vertical = 8.dp)
                    .clickable(actionRunCallback<RefreshExampleWeatherWidgetAction>()),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Refresh",
                    style = TextStyle(
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(Color.White)
                    )
                )
            }
        }
    }
}

// Action callback for refresh button
class RefreshExampleWeatherWidgetAction : ActionCallback {
    override suspend fun onAction(
        context: Context,
        glanceId: GlanceId,
        parameters: ActionParameters
    ) {
        Log.d("ExampleWeatherWidget", "RefreshExampleWeatherWidgetAction triggered")
        
        // Load data from SharedPreferences
        val data = ExampleWeatherWidget_getItem(context, "savedData", "group.expo.modules.exampleweather.example") ?: "No data"
        val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
            .format(java.util.Date())
        
        // Update widget state
        updateAppWidgetState(context, glanceId) { prefs ->
            prefs[ExampleWeatherWidgetStateKeys.DATA_KEY] = data
            prefs[ExampleWeatherWidgetStateKeys.LAST_UPDATE] = timestamp
        }
        
        // Trigger widget update
        ExampleWeatherWidget_Widget().update(context, glanceId)
        
        Log.d("ExampleWeatherWidget", "Widget state updated with: $data")
    }
}

class ExampleWeatherWidget : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = ExampleWeatherWidget_Widget()
    
    private val coroutineScope = MainScope()
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d("ExampleWeatherWidget", "=== onUpdate called for ${appWidgetIds.size} widgets ===")
        try {
            super.onUpdate(context, appWidgetManager, appWidgetIds)
            
            // Launch coroutine to update widgets
            coroutineScope.launch {
                try {
                    val manager = GlanceAppWidgetManager(context)
                    
                    appWidgetIds.forEach { appWidgetId ->
                        Log.d("ExampleWeatherWidget", "Updating widget ID: $appWidgetId")
                        val glanceId = manager.getGlanceIdBy(appWidgetId)
                        
                        // Load fresh data from SharedPreferences
                        val data = ExampleWeatherWidget_getItem(context, "savedData", "group.expo.modules.exampleweather.example") ?: "No data"
                        val timestamp = java.text.SimpleDateFormat("HH:mm:ss", java.util.Locale.getDefault())
                            .format(java.util.Date())
                        
                        Log.d("ExampleWeatherWidget", "Loaded data from SharedPreferences: $data")
                        
                        // Update widget state with fresh data
                        updateAppWidgetState(context, glanceId) { prefs ->
                            prefs[ExampleWeatherWidgetStateKeys.DATA_KEY] = data
                            prefs[ExampleWeatherWidgetStateKeys.LAST_UPDATE] = timestamp
                        }
                        
                        // Trigger widget update
                        glanceAppWidget.update(context, glanceId)
                        
                        Log.d("ExampleWeatherWidget", "Widget state and UI updated successfully")
                    }
                } catch (e: Exception) {
                    Log.e("ExampleWeatherWidget", "Error updating widget in coroutine", e)
                }
            }
            
            Log.d("ExampleWeatherWidget", "=== onUpdate completed successfully ===")
        } catch (e: Exception) {
            Log.e("ExampleWeatherWidget", "Error in onUpdate", e)
        }
    }
}

private fun ExampleWeatherWidget_getItem(
    context: Context,
    key: String,
    preferenceName: String
): String? {
    try {
        Log.d("ExampleWeatherWidget", "getItem - preference: $preferenceName, key: $key")
        val preferences = context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
        val value = preferences.getString(key, null)
        Log.d("ExampleWeatherWidget", "getItem - value: $value")
        return value
    } catch (e: Exception) {
        Log.e("ExampleWeatherWidget", "Error in getItem", e)
        return null
    }
}
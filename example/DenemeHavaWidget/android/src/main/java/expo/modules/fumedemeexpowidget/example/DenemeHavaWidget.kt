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
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import androidx.glance.unit.ColorProvider
import android.util.Log

class DenemeHavaWidget_Widget : GlanceAppWidget() {
    
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val data = DenemeHavaWidget_getItem(context, "savedData", "group.expo.modules.havadeneme.example") ?: ""
        
        provideContent {
         DenemeHavaWidgetContent(data)
        }
    }
}

@Composable
fun DenemeHavaWidgetContent(data: String) {
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
                text = "Hello World",
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
            
            val displayText = if (data.isNotEmpty()) data else "No data yet"
            val displayColor = if (data.isNotEmpty()) Color(0xFF4CAF50) else Color(0xFF999999)
            
            Text(
                text = displayText,
                style = TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Normal,
                    color = ColorProvider(displayColor)
                )
            )
        }
}

class DenemeHavaWidget : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = DenemeHavaWidget_Widget()

    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        Log.d("DenemeHavaWidget", "=== onUpdate called for ${appWidgetIds.size} widgets ===")
        try {
            super.onUpdate(context, appWidgetManager, appWidgetIds)
            Log.d("DenemeHavaWidget", "=== onUpdate completed successfully ===")
        } catch (e: Exception) {
            Log.e("DenemeHavaWidget", "Error in onUpdate", e)
        }
    }
}

private fun DenemeHavaWidget_getItem(
    context: Context,
    key: String,
    preferenceName: String
): String? {
    try {
        Log.d("DenemeHavaWidget", "getItem - preference: $preferenceName, key: $key")
        val preferences = context.getSharedPreferences(preferenceName, Context.MODE_PRIVATE)
        val value = preferences.getString(key, null)
        Log.d("DenemeHavaWidget", "getItem - value: $value")
        return value
    } catch (e: Exception) {
        Log.e("DenemeHavaWidget", "Error in getItem", e)
        return null
    }
}
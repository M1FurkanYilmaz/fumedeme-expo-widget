package expo.modules.fumedemeexpowidget

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager

class FumedemeExpoWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Widget")

    // Reload all widgets
    Function("reloadAll") {
      val widgetNames = getWidgetNames()
      if (widgetNames.isEmpty()) {
        throw Exception("No widgets configured in app.json")
      }

      for (widgetName in widgetNames) {
        val widgetComponentName = getWidgetComponentName(widgetName)
        if (widgetComponentName != null) {
          val widgetManager = AppWidgetManager.getInstance(context)
          val appWidgetIds = widgetManager.getAppWidgetIds(widgetComponentName)
          val updateIntent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE, null)
            .setComponent(widgetComponentName)
          updateIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
          context.sendBroadcast(updateIntent)
        }
      }
    }

    Function("setItem") { value: String, key: String, appGroup: String ->
      getPreferences(appGroup).edit().putString(key, value).commit()
    }

    Function("getItem") { key: String, appGroup: String ->
      return@Function getPreferences(appGroup).getString(key, "")
    }
  }

  private val context
    get() = requireNotNull(appContext.reactContext)

  private fun getPreferences(appGroup: String): SharedPreferences {
    return context.getSharedPreferences(appGroup, Context.MODE_PRIVATE)
  }

  private fun getWidgetNames(): List<String> {
    val applicationInfo = context.packageManager?.getApplicationInfo(
      context.packageName.toString(),
      PackageManager.GET_META_DATA
    )
    val widgetNamesString = applicationInfo?.metaData?.getString("WIDGET_NAMES")
    return widgetNamesString?.split(",")?.map { it.trim() } ?: emptyList()
  }

  private fun getWidgetComponentName(widgetName: String): ComponentName? {
    val widgetList = AppWidgetManager.getInstance(context).installedProviders
    for (providerInfo in widgetList) {
      if (providerInfo.provider.packageName.equals(context.packageName) &&
        providerInfo.provider.shortClassName.endsWith(".$widgetName")
      ) {
        return providerInfo.provider
      }
    }
    return null
  }
}
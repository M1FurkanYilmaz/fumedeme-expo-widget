import { ConfigPlugin, withAppBuildGradle } from "@expo/config-plugins"

/**
 * Add Kotlin dependencies and serialization plugin to app build.gradle
 * @param config
 * @returns
 */
export const withWidgetAppBuildGradle: ConfigPlugin = config => {
  return withAppBuildGradle(config, async newConfig => {
    let buildGradle = newConfig.modResults.contents
    
    // Ensure Kotlin plugin is applied
    const kotlinPluginSearch = /(apply plugin: "com\.android\.application"\n)/
    const kotlinPluginReplace = `$1apply plugin: "kotlin-android"\n`
    buildGradle = buildGradle.replace(kotlinPluginSearch, kotlinPluginReplace)
    
    // Add Kotlin serialization plugin after kotlin-android
    if (!buildGradle.includes('apply plugin: "org.jetbrains.kotlin.plugin.serialization"')) {
      const serializationPluginSearch = /(apply plugin: "kotlin-android"\n)/
      const serializationPluginReplace = `$1apply plugin: "org.jetbrains.kotlin.plugin.serialization"\n`
      buildGradle = buildGradle.replace(serializationPluginSearch, serializationPluginReplace)
    }
    
    // Add dependencies if they are not already present
    if (!buildGradle.includes("org.jetbrains.kotlinx:kotlinx-coroutines-android")) {
      buildGradle = buildGradle.replace(
        /dependencies\s?{/,
        `dependencies {
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    implementation "org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2"`,
      )
    }
    
    newConfig.modResults.contents = buildGradle
    return newConfig
  })
}
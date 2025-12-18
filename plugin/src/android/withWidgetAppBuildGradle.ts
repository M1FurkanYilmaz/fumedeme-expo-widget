import { ConfigPlugin, withAppBuildGradle } from "@expo/config-plugins"

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

    if (!buildGradle.includes("buildFeatures {")) {
      buildGradle = buildGradle.replace(
        /android\s?{/,
        `android {
    buildFeatures {
        compose true
    }
`
      )
    }

    if (!buildGradle.includes('org.jetbrains.kotlin.plugin.compose')) {
      buildGradle = buildGradle.replace(
        /apply plugin:\s*"kotlin-android"\s*\n/,
        match =>
          `${match}apply plugin: "org.jetbrains.kotlin.plugin.compose"\n`
      );
    }

    if (!buildGradle.includes("org.jetbrains.kotlin.plugin.compose")) {
      buildGradle = buildGradle.replace(
        /plugins\s*{/,
        `plugins {
    id "org.jetbrains.kotlin.plugin.compose" version "2.0.21"`
      );
    }


    // Add Glance and other dependencies if not present
    if (!buildGradle.includes("androidx.glance:glance-appwidget")) {
      buildGradle = buildGradle.replace(
        /dependencies\s?{/,
        `dependencies {
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
    implementation "org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2"
    implementation "androidx.glance:glance-appwidget:1.1.1"
    implementation "androidx.glance:glance:1.1.1"
    implementation "androidx.compose.runtime:runtime:1.6.0"
    implementation "androidx.compose.ui:ui:1.6.0"
    implementation "androidx.datastore:datastore-preferences:1.1.1"`,
      )
    }

    newConfig.modResults.contents = buildGradle
    return newConfig
  })
}
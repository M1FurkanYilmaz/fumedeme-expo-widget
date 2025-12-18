import { ConfigPlugin, withProjectBuildGradle } from "@expo/config-plugins";

/**
 * Add configuration of kotlin-gradle-plugin
 * @param config
 * @returns
 */
export const withWidgetProjectBuildGradle: ConfigPlugin = (config) => {
  return withProjectBuildGradle(config, async (newConfig) => {
    let buildGradle = newConfig.modResults.contents;

    //     if (!buildGradle.includes("alias(libs.plugins.compose.compiler)")) {
    //       if (buildGradle.includes("plugins {")) {
    //         buildGradle = buildGradle.replace(
    //           /plugins\s*{/,
    //           `plugins {
    //     alias(libs.plugins.compose.compiler)`
    //         );
    //       } else {
    //         buildGradle =
    //           `plugins {
    //     alias(libs.plugins.compose.compiler)
    // }

    // ` + buildGradle;
    //       }
    //     }

    if (!buildGradle.includes("kotlin-compose-compiler-plugin")) {
      const search = /dependencies\s?{/;
      const replace = `dependencies {
      classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:\${project.hasProperty('kotlinVersion') ? project.ext.kotlinVersion : '2.0.21'}"
      classpath "org.jetbrains.kotlin:kotlin-compose-compiler-plugin:\${project.hasProperty('kotlinVersion') ? project.ext.kotlinVersion : '2.0.21'}"
      classpath("org.jetbrains.kotlin.plugin.compose:org.jetbrains.kotlin.plugin.compose.gradle.plugin:\${project.hasProperty('kotlinVersion') ? project.ext.kotlinVersion : '2.0.21'}")`;
      const newBuildGradle = buildGradle.replace(search, replace);
      newConfig.modResults.contents = newBuildGradle;
    }

    return newConfig;
  });
};

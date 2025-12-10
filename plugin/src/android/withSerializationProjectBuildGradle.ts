import { ConfigPlugin, withProjectBuildGradle } from "@expo/config-plugins"

/**
 * Add Kotlin dependencies and serialization plugin to app build.gradle
 * @param config
 * @returns
 */
export const withSerializationProjectBuildGradle: ConfigPlugin = config => {
  return withProjectBuildGradle(config, async config => {
    if (!config.modResults.contents.includes("kotlin-serialization")) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s?{/,
        `dependencies {
          classpath('org.jetbrains.kotlin:kotlin-serialization')`
      );
    }
    return config;
  })
}
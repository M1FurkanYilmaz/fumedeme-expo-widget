import { ConfigPlugin } from "@expo/config-plugins";
import { withWidgetAppBuildGradle } from "./withWidgetAppBuildGradle";
import { withWidgetManifest } from "./withWidgetManifest";
import { withWidgetProjectBuildGradle } from "./withWidgetProjectBuildGradle";
import { withWidgetSourceCodes } from "./withWidgetSourceCodes";
import { withSerializationProjectBuildGradle } from "./withSerializationProjectBuildGradle";
import { Props } from "..";

/**
 * @param config
 * @returns
 */
export const withWidgetAndroid: ConfigPlugin<Props> = (
  config,
  { widgetName, ios: { appGroupIdentifier } }
) => {
  try {
    config = withWidgetManifest(config, { widgetName });
  } catch (error) {
    console.log("withWidgetManifest hatası: ", error);
    throw error;
  }
  try {
    config = withWidgetProjectBuildGradle(config);
  } catch (error) {
    console.log("withWidgetProjectBuildGradle hatası: ", error);
    throw error;
  }
  try {
    config = withWidgetAppBuildGradle(config);
  } catch (error) {
    console.log("withWidgetAppBuildGradle hatası: ", error);
    throw error;
  }
  try {
    config = withWidgetSourceCodes(config, {
      widgetName,
      appGroupName: appGroupIdentifier,
    });
  } catch (error) {
    console.log("withWidgetSourceCodes hatası: ", error);
    throw error;
  }
  try {
    config = withSerializationProjectBuildGradle(config);
  } catch (error) {
    console.log("withSerializationProjectBuildGradle hatası: ", error);
    throw error;
  }
  return config;
};

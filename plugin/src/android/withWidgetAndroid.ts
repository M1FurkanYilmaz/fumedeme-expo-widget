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
    throw error;
  }
  try {
    config = withWidgetProjectBuildGradle(config);
  } catch (error) {
    throw error;
  }
  try {
    config = withWidgetAppBuildGradle(config);
  } catch (error) {
    throw error;
  }
  try {
    config = withWidgetSourceCodes(config, {
      widgetName,
      appGroupName: appGroupIdentifier,
    });
  } catch (error) {
    throw error;
  }
  try {
    config = withSerializationProjectBuildGradle(config);
  } catch (error) {
    throw error;
  }
  return config;
};

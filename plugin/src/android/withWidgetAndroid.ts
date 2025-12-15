import { ConfigPlugin } from "@expo/config-plugins";
import { withWidgetAppBuildGradle } from "./withWidgetAppBuildGradle";
import { withWidgetManifest } from "./withWidgetManifest";
import { withWidgetProjectBuildGradle } from "./withWidgetProjectBuildGradle";
import { withWidgetSourceCodes } from "./withWidgetSourceCodes";
import { withSerializationProjectBuildGradle } from "./withSerializationProjectBuildGradle";
import { WidgetConfig } from "..";

export const withWidgetAndroid: ConfigPlugin<WidgetConfig> = (
  config,
  { widgetName, ios: { appGroupIdentifier } }
) => {
  config = withWidgetManifest(config, { widgetName });
  config = withWidgetProjectBuildGradle(config);
  config = withWidgetAppBuildGradle(config);
  config = withWidgetSourceCodes(config, {
    widgetName,
    appGroupName: appGroupIdentifier,
  });
  config = withSerializationProjectBuildGradle(config);

  return config;
};

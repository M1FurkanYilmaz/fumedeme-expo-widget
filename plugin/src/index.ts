import { ConfigPlugin, withPlugins } from "@expo/config-plugins";
import { withWidgetAndroid } from "./android/withWidgetAndroid";
import { withWidgetIos } from "./ios/withWidgetIos";

export interface WidgetConfig {
  widgetName: string;
  ios: {
    devTeamId: string;
    appGroupIdentifier: string;
    topLevelFiles?: string[];
  };
}

export type Props = WidgetConfig | WidgetConfig[];

const withAppConfigs: ConfigPlugin<Props> = (config, options) => {
  const bundleIdentifier = config.ios?.bundleIdentifier;
  if (!bundleIdentifier) {
    return config;
  }

  // Normalize to array
  const widgets = Array.isArray(options) ? options : [options];

  // Apply each widget configuration
  for (const widget of widgets) {
    config = withPlugins(config, [
      [withWidgetAndroid, widget],
      [withWidgetIos, widget],
    ]);
  }

  return config;
};

export default withAppConfigs;

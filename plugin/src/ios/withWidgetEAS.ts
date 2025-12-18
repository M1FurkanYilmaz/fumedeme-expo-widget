import { ConfigPlugin } from "@expo/config-plugins";

interface Props {
  widgetName: string;
}

export const withWidgetEAS: ConfigPlugin<Props> = (config, { widgetName }) => {
  config.extra = config.extra || {};
  config.extra.eas = config.extra.eas || {};
  config.extra.eas.build = config.extra.eas.build || {};
  config.extra.eas.build.experimental =
    config.extra.eas.build.experimental || {};
  config.extra.eas.build.experimental.ios =
    config.extra.eas.build.experimental.ios || {};
  config.extra.eas.build.experimental.ios.appExtensions =
    config.extra.eas.build.experimental.ios.appExtensions || [];

  const bundleIdentifier = config.ios?.bundleIdentifier || "";
  if (!bundleIdentifier) {
    throw new Error(
      "[withWidget] Unable to find bundleIdentifier in app.json at config.ios.bundleIdentifier. Please add it and try again."
    );
  }

  const extensionBundleId = `${bundleIdentifier}.${widgetName.toLowerCase()}`;

  // Check if this specific widget already exists
  const existingWidget =
    config.extra.eas.build.experimental.ios.appExtensions.find(
      (extension: { bundleIdentifier?: string }) =>
        extension.bundleIdentifier === extensionBundleId
    );

  if (existingWidget) {
    console.log(
      `[withWidget] Widget extension ${widgetName} already configured, skipping...`
    );
    return config;
  }

  config.extra.eas.build.experimental.ios.appExtensions = [
    ...config.extra.eas.build.experimental.ios.appExtensions,
    {
      targetName: widgetName,
      bundleIdentifier: extensionBundleId,
    },
  ];

  return config;
};

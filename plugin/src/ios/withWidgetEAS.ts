import { ConfigPlugin } from "@expo/config-plugins";

interface Props {
  widgetName: string;
}
// Bu plugin, ekstra bir props kullanmıyor; tip olarak yine de ikinci parametreyi
// kabul edecek şekilde tanımlamamız gerekiyor ki ConfigPlugin imzasıyla uyumlu olsun.
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

  const widget = config.extra.eas.build.experimental.ios.appExtensions.find(
    (extension: { widgetName?: string }) => extension.widgetName === widgetName
  );

  if (widget) {
    throw new Error(
      `[withWidget] Found existing widget extension in app.json at config.extra.eas.build.experimental.ios.appExtensions. Please remove it and try again.`
    );
  }

  const bundleIdentifier = config.ios?.bundleIdentifier || "";

  if (!bundleIdentifier) {
    throw new Error(
      `[withWidget] Unable to find bundleIdentifier in app.json at config.ios.bundleIdentifier. Please add it and try again.`
    );
  }

  config.extra.eas.build.experimental.ios.appExtensions = [
    ...config.extra.eas.build.experimental.ios.appExtensions,
    {
      widgetName: widgetName,
      bundleIdentifier: `${bundleIdentifier}.widget`,
    },
  ];

  return config;
};

import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
} from "@expo/config-plugins";

export const withWidgetManifest: ConfigPlugin<{ widgetName: string }> = (
  config,
  { widgetName }
) => {
  return withAndroidManifest(config, (config) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(
      config.modResults
    );

    // ----- RECEIVER (unchanged) -----
    app.receiver ??= [];
    if (!app.receiver.some((r) => r.$?.["android:name"] === `.${widgetName}`)) {
      app.receiver.push(buildWidgetReceiver(widgetName));
    }

    // ----- META-DATA (FIX) -----
    app["meta-data"] ??= [];

    const META_KEY = "WIDGET_NAMES";

    // Read existing
    const existing = app["meta-data"].find(
      (m) => m.$?.["android:name"] === META_KEY
    )?.$?.["android:value"];

    const names = existing ? existing.split(",").map((s) => s.trim()) : [];

    if (!names.includes(widgetName)) {
      names.push(widgetName);
    }

    // Remove old entry
    app["meta-data"] = app["meta-data"].filter(
      (m) => m.$?.["android:name"] !== META_KEY
    );

    // Add merged entry
    app["meta-data"].push({
      $: {
        "android:name": META_KEY,
        "android:value": names.join(","),
      },
    });

    return config;
  });
};

function buildWidgetReceiver(widgetName: string) {
  return {
    $: {
      "android:name": `.${widgetName}`,
      "android:exported": "true" as const,
    },
    "intent-filter": [
      {
        action: [
          {
            $: {
              "android:name": "android.appwidget.action.APPWIDGET_UPDATE",
            },
          },
        ],
      },
    ],
    "meta-data": [
      {
        $: {
          "android:name": "android.appwidget.provider",
          "android:resource": `@xml/${widgetName.toLowerCase()}_info`,
        },
      },
    ],
  };
}

import {
  ConfigPlugin,
  withXcodeProject,
  withDangerousMod,
  withEntitlementsPlist,
} from "@expo/config-plugins";
import * as fs from "fs";
import * as path from "path";
import { withWidgetEAS } from "./withWidgetEAS";
import { withWidgetPlist } from "./withWidgetPlist";
import { WidgetConfig } from "..";
import { addBroadcastExtensionXcodeTarget } from "./withWidgetXCodeTarget";

export const withWidgetIos: ConfigPlugin<WidgetConfig> = (
  config,
  { widgetName, ios }
) => {
  const { appGroupIdentifier, devTeamId } = ios;
  const topLevelFiles = ios.topLevelFiles || [
    `${widgetName}.swift`,
    "Assets.xcassets",
  ];

  config = withXcodeProject(config, async (config) => {
    const appName = config.modRequest.projectName!;
    const extensionBundleIdentifier = `${config.ios!.bundleIdentifier!}.${widgetName.toLowerCase()}`;
    const currentProjectVersion = config.ios!.buildNumber || "1";
    const marketingVersion = config.version!;

    await addBroadcastExtensionXcodeTarget(config.modResults, {
      appName,
      extensionName: widgetName,
      extensionBundleIdentifier,
      currentProjectVersion,
      marketingVersion,
      devTeamId,
      topLevelFiles,
    });

    const proj = config.modResults;
    const targetUuid = proj.findTargetKey(widgetName);
    const groupUuid = proj.findPBXGroupKey({ name: widgetName });

    if (!targetUuid) {
      throw new Error(
        `withWidgetIos: Target '${widgetName}' not found in Xcode project.`
      );
    }
    if (!groupUuid) {
      throw new Error(`withWidgetIos: PBXGroup for '${widgetName}' not found.`);
    }

    const entitlementsFilename = `${widgetName}.entitlements`;
    proj.addFile(entitlementsFilename, groupUuid, {
      target: targetUuid,
      lastKnownFileType: "text.plist.entitlements",
    });

    proj.updateBuildProperty(
      "CODE_SIGN_ENTITLEMENTS",
      `${widgetName}/${entitlementsFilename}`,
      null,
      widgetName
    );

    const targetSwiftFileName = `${widgetName}.swift`;
    proj.addSourceFile(targetSwiftFileName, { target: targetUuid }, groupUuid);

    return config;
  });

  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const extensionRootPath = path.join(
        config.modRequest.platformProjectRoot,
        widgetName
      );
      const projectPath = config.modRequest.projectRoot;

      await fs.promises.mkdir(extensionRootPath, { recursive: true });

      // Create entitlements file
      const entitlementsFilename = `${widgetName}.entitlements`;
      const entitlementsPath = path.join(
        extensionRootPath,
        entitlementsFilename
      );
      const staticEntitlementsPath = path.join(
        __dirname,
        "static",
        "widget.entitlements"
      );
      let entitlementsContent = fs.readFileSync(staticEntitlementsPath, "utf8");
      entitlementsContent = entitlementsContent.replace(
        /group\.expo\.modules\.widgetsync\.example/g,
        appGroupIdentifier
      );
      await fs.promises.writeFile(entitlementsPath, entitlementsContent);

      // Handle source files
      const widgetSourceDirPath = path.join(
        projectPath,
        widgetName,
        "ios",
        "widget"
      );

      if (!fs.existsSync(widgetSourceDirPath)) {
        await fs.promises.mkdir(widgetSourceDirPath, { recursive: true });
        const widgetStaticSourceDirPath = path.join(__dirname, "static");

        await fs.promises.copyFile(
          path.join(widgetStaticSourceDirPath, "widget.swift"),
          path.join(widgetSourceDirPath, "widget.swift")
        );

        await fs.promises.cp(
          path.join(widgetStaticSourceDirPath, "Assets.xcassets"),
          path.join(widgetSourceDirPath, "Assets.xcassets"),
          { recursive: true }
        );

        const widgetSourceFilePath = path.join(
          widgetSourceDirPath,
          "widget.swift"
        );
        const content = fs.readFileSync(widgetSourceFilePath, "utf8");
        const newContent = content.replace(
          /group\.expo\.modules\.widgetsync\.example/g,
          appGroupIdentifier
        );
        fs.writeFileSync(widgetSourceFilePath, newContent);
      }

      const targetSwiftFileName = `${widgetName}.swift`;
      await fs.promises.copyFile(
        path.join(widgetSourceDirPath, "widget.swift"),
        path.join(extensionRootPath, targetSwiftFileName)
      );

      await fs.promises.cp(
        path.join(widgetSourceDirPath, "Assets.xcassets"),
        path.join(extensionRootPath, "Assets.xcassets"),
        { recursive: true }
      );

      return config;
    },
  ]);

  config = withWidgetPlist(config, { widgetName });
  config = withWidgetEAS(config, { widgetName });

  // Add app group to main app's entitlements
  config = withEntitlementsPlist(config, (config) => {
    if (!config.modResults["com.apple.security.application-groups"]) {
      config.modResults["com.apple.security.application-groups"] = [];
    }

    const appGroups = config.modResults[
      "com.apple.security.application-groups"
    ] as string[];
    if (!appGroups.includes(appGroupIdentifier)) {
      appGroups.push(appGroupIdentifier);
    }

    return config;
  });

  return config;
};

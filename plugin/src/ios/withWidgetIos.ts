import {
  ConfigPlugin,
  withXcodeProject,
  withDangerousMod,
} from "@expo/config-plugins";
import * as fs from "fs";
import * as path from "path";
import { withWidgetEAS } from "./withWidgetEAS";
import { withWidgetPlist } from "./withWidgetPlist";
import { Props } from "..";
import { addBroadcastExtensionXcodeTarget } from "./withWidgetXCodeTarget";

export const withWidgetIos: ConfigPlugin<Props> = (
  config,
  { widgetName, ios }
) => {
  const { appGroupIdentifier, devTeamId } = ios;
  const topLevelFiles = [`${widgetName}.swift`, "Assets.xcassets"];

  console.log("ios konfiglere başlandı TOP LEVEL FILES: ", topLevelFiles);

  // SINGLE withXcodeProject call - all Xcode project modifications together
  config = withXcodeProject(config, async (config) => {
    const appName = config.modRequest.projectName!;
    const extensionBundleIdentifier = `${config.ios!.bundleIdentifier!}.widget`;
    const currentProjectVersion = config.ios!.buildNumber || "1";
    const marketingVersion = config.version!;

    // 1. Create the widget target
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

    // 2. Add entitlements file to Xcode project
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

    // 3. Add source file to Xcode project
    proj.addSourceFile(targetSwiftFileName, { target: targetUuid }, groupUuid);

    console.log("with xcode target, entitlements, and source files configured");

    return config;
  });

  // File system operations - copy actual files to disk
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const extensionRootPath = path.join(
        config.modRequest.platformProjectRoot,
        widgetName
      );
      const projectPath = config.modRequest.projectRoot;

      // Create extension directory
      await fs.promises.mkdir(extensionRootPath, { recursive: true });

      // 1. Create and copy entitlements file
      const entitlementsFilename = `${widgetName}.entitlements`;
      const entitlementsPath = path.join(
        extensionRootPath,
        entitlementsFilename
      );

      // Read the static entitlements template
      const staticEntitlementsPath = path.join(
        __dirname,
        "static",
        "widget.entitlements"
      );
      let entitlementsContent = fs.readFileSync(staticEntitlementsPath, "utf8");

      // Replace the placeholder group identifier
      entitlementsContent = entitlementsContent.replace(
        /group\.expo\.modules\.widgetsync\.example/g,
        appGroupIdentifier
      );

      await fs.promises.writeFile(entitlementsPath, entitlementsContent);

      // 2. Copy source files
      const widgetSourceDirPath = path.join(
        projectPath,
        widgetName,
        "ios",
        "widget"
      );

      if (!fs.existsSync(widgetSourceDirPath)) {
        await fs.promises.mkdir(widgetSourceDirPath, { recursive: true });

        const widgetStaticSourceDirPath = path.join(__dirname, "static");

        // Copy widget.swift
        await fs.promises.copyFile(
          path.join(widgetStaticSourceDirPath, "widget.swift"),
          path.join(widgetSourceDirPath, "widget.swift")
        );

        // Copy Assets.xcassets
        await fs.promises.cp(
          path.join(widgetStaticSourceDirPath, "Assets.xcassets"),
          path.join(widgetSourceDirPath, "Assets.xcassets"),
          { recursive: true }
        );

        // Replace app group identifier in widget.swift
        const widgetSourceFilePath = path.join(
          widgetSourceDirPath,
          "widget.swift"
        );
        const content = fs.readFileSync(widgetSourceFilePath, "utf8");
        const newContent = content.replace(
          /group\.expo\.modules\.widgetsync\.example/g,
          `${appGroupIdentifier}`
        );
        fs.writeFileSync(widgetSourceFilePath, newContent);
      }

      // Copy to extension root path with proper naming
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

      console.log("with widget files copied to disk");

      return config;
    },
  ]);

  // Keep these separate - they don't modify Xcode project
  config = withWidgetPlist(config, { widgetName });
  console.log("with widget plist configi sonrası");

  config = withWidgetEAS(config, { widgetName });
  console.log("with widget eas configi sonrası");

  console.log("ios konfigleri bitti");

  return config;
};

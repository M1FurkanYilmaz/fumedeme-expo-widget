/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ConfigPlugin, withDangerousMod } from "@expo/config-plugins";
import { BundleIdentifier } from "@expo/config-plugins/build/ios";
import fs from "fs";
import path from "path";

export const withWidgetSourceCodes: ConfigPlugin<{
  widgetName: string;
  appGroupName: string;
}> = (config, { widgetName, appGroupName }) => {
  return withDangerousMod(config, [
    "android",
    async (newConfig) => {
      const projectRoot = newConfig.modRequest.projectRoot;
      const platformRoot = newConfig.modRequest.platform;
      const widgetDir = path.join(projectRoot, widgetName);

      await copyResourceFiles(widgetDir, platformRoot, widgetName);

      const packageName = config.android?.package;
      await prepareSourceCodes(
        widgetDir,
        platformRoot,
        packageName!,
        widgetName,
        appGroupName,
        config
      );

      return newConfig;
    },
  ]);
};

async function copyResourceFiles(
  widgetSourceDir: string,
  platformRoot: string,
  widgetName: string
) {
  const source = path.join(widgetSourceDir, "android", "src", "main", "res");
  const resDest = path.join(platformRoot, "app", "src", "main", "res");
  const lowercaseWidgetName = widgetName.toLowerCase();

  if (!fs.existsSync(source)) {
    const resRoot = path.join(widgetSourceDir, "android/src/main/res");
    await fs.promises.mkdir(resRoot, { recursive: true });

    const templateFolder = path.join(__dirname, "static", "res");
    await fs.promises.cp(templateFolder, resRoot, { recursive: true });

    // Rename layout file with lowercase name
    const layoutDir = path.join(source, "layout");
    if (fs.existsSync(layoutDir)) {
      const oldLayoutPath = path.join(layoutDir, "device_status_widget.xml");
      const newLayoutPath = path.join(layoutDir, `${lowercaseWidgetName}.xml`);
      if (fs.existsSync(oldLayoutPath)) {
        await fs.promises.rename(oldLayoutPath, newLayoutPath);
      }
    }

    // Rename xml info file with lowercase name
    const xmlDir = path.join(source, "xml");
    if (fs.existsSync(xmlDir)) {
      const oldXmlPath = path.join(xmlDir, "device_status_widget_info.xml");
      const newXmlPath = path.join(xmlDir, `${lowercaseWidgetName}_info.xml`);
      if (fs.existsSync(oldXmlPath)) {
        await fs.promises.rename(oldXmlPath, newXmlPath);
        // Update content inside xml info file
        let xmlContent = fs.readFileSync(newXmlPath, "utf8");
        xmlContent = xmlContent.replace(
          /@layout\/device_status_widget/g,
          `@layout/${lowercaseWidgetName}`
        );
        fs.writeFileSync(newXmlPath, xmlContent);
      }
    }
  }

  await fs.promises.cp(source, resDest, { recursive: true });
}

async function prepareSourceCodes(
  widgetDir: string,
  platformRoot: string,
  packageName: string,
  widgetName: string,
  appGroupName: string,
  config: any
) {
  const packageDirPath = packageName.replace(/\./g, "/");
  const userJavaDir = path.join(
    widgetDir,
    "android/src/main/java",
    packageDirPath
  );
  const templateJavaDir = path.join(__dirname, "static/java/package_name");
  const widgetSourceFilePath = path.join(userJavaDir, `${widgetName}.kt`);

  // 1) If user files don't exist → copy template (first time only)
  if (!fs.existsSync(userJavaDir)) {
    await fs.promises.mkdir(userJavaDir, { recursive: true });
    await fs.promises.cp(templateJavaDir, userJavaDir, { recursive: true });

    // widget.kt → user's widgetName.kt
    await fs.promises.rename(
      path.join(userJavaDir, "widget.kt"),
      widgetSourceFilePath
    );

    // Replace template content
    let content = fs.readFileSync(widgetSourceFilePath, "utf8");
    const lowercaseWidgetName = widgetName.toLowerCase();

    content = content.replace(/\{\{WIDGET_NAME\}\}/g, widgetName);
    content = content.replace(/\{\{LAYOUT_NAME\}\}/g, lowercaseWidgetName);
    content = content.replace(/\{\{GROUP_IDENTIFIER\}\}/g, appGroupName);
    content = content.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);

    const bundeIdentifier = BundleIdentifier.getBundleIdentifier(config);
    if (bundeIdentifier)
      content = content.replace(/\{\{BUNDLE_IDENTIFIER\}\}/g, bundeIdentifier);

    fs.writeFileSync(widgetSourceFilePath, content);
  }

  // 2) Copy user files to Android project
  const androidAppJavaDir = path.join(
    platformRoot,
    "app/src/main/java",
    packageDirPath
  );
  await fs.promises.cp(userJavaDir, androidAppJavaDir, { recursive: true });

  // 3) Make shared code private to avoid conflicts between widgets
  const destWidgetFile = path.join(androidAppJavaDir, `${widgetName}.kt`);
  let destContent = fs.readFileSync(destWidgetFile, "utf8");

  // Update package name
  destContent = destContent.replace(/^package .*$/m, `package ${packageName}`);

  // Make all shared components private/internal to this widget file
  destContent = makeSharedCodePrivate(destContent, widgetName);

  fs.writeFileSync(destWidgetFile, destContent);
}

function makeSharedCodePrivate(content: string, widgetName: string): string {
  // Make data classes private with unique names
  content = content.replace(
    /@Serializable\s+data class Plug\s*\(/g,
    `@Serializable\nprivate data class ${widgetName}_Plug(`
  );

  content = content.replace(
    /@Serializable\s+data class Device\s*\(/g,
    `@Serializable\nprivate data class ${widgetName}_Device(`
  );

  // Update all references to Plug -> widgetName_Plug
  content = content.replace(
    /(\s|:|<|,|\()Plug(\s|>|,|\)|\.)/g,
    `$1${widgetName}_Plug$2`
  );

  // Update all references to Device -> widgetName_Device
  content = content.replace(
    /(\s|:|<|,|\()Device(\s|>|,|\)|\.)/g,
    `$1${widgetName}_Device$2`
  );

  // Make getItem function private
  content = content.replace(
    /^internal fun getItem\s*\(/gm,
    `private fun ${widgetName}_getItem(`
  );

  content = content.replace(
    /^fun getItem\s*\(/gm,
    `private fun ${widgetName}_getItem(`
  );

  // Update all calls to getItem
  content = content.replace(/\bgetItem\(/g, `${widgetName}_getItem(`);

  // Make DeviceDataManager class private with unique name
  content = content.replace(
    /class DeviceDataManager\s+private constructor\(\)/g,
    `private class ${widgetName}_DeviceDataManager private constructor()`
  );

  // Update companion object reference
  content = content.replace(
    /companion object\s*\{\s*val shared = DeviceDataManager\(\)/g,
    `companion object {\n        val shared = ${widgetName}_DeviceDataManager()`
  );

  // Update all references to DeviceDataManager
  content = content.replace(
    /DeviceDataManager\.shared/g,
    `${widgetName}_DeviceDataManager.shared`
  );

  content = content.replace(
    /(\s|:|<|,|\()DeviceDataManager(\s|>|,|\)|\.)/g,
    `$1${widgetName}_DeviceDataManager$2`
  );

  return content;
}

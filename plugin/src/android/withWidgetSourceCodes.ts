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
      const platformRoot = newConfig.modRequest.platformProjectRoot;
      const widgetDir = path.join(projectRoot, widgetName);
      await copyResourceFiles(widgetDir, platformRoot, widgetName);

      const packageName = config.android?.package;
      prepareSourceCodes(
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

  if (!fs.existsSync(widgetSourceDir)) {
    const templateFolder = path.join(__dirname, "static", "res");
    await fs.promises.cp(templateFolder, source, { recursive: true });

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

  // 1) Eğer kullanıcı dosyaları yoksa → template kopyalanır (sadece ilk kez)
  if (!fs.existsSync(userJavaDir)) {
    await fs.promises.mkdir(userJavaDir, { recursive: true });
    await fs.promises.cp(templateJavaDir, userJavaDir, { recursive: true });

    // widget.kt → kullanıcı widgetName.kt
    await fs.promises.rename(
      path.join(userJavaDir, "widget.kt"),
      widgetSourceFilePath
    );

    // template içeriği replace edilir
    let content = fs.readFileSync(widgetSourceFilePath, "utf8");
    const lowercaseWidgetName = widgetName.toLowerCase();

    content = content.replace(/\{\{WIDGET_NAME\}\}/g, widgetName);
    content = content.replace(/\{\{LAYOUT_NAME\}\}/g, lowercaseWidgetName);
    content = content.replace(/\{\{GROUP_IDENTIFIER\}\}/g, appGroupName);
    content = content.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);

    const bundeIdentifier = BundleIdentifier.getBundleIdentifier(config);

    if (bundeIdentifier)
      content = content.replace(/\{\{PACKAGE_NAME\}\}/g, bundeIdentifier);

    fs.writeFileSync(widgetSourceFilePath, content);
  }

  // 2) Kullanıcı dosyaları Android projesine kopyalanır
  const androidAppJavaDir = path.join(
    platformRoot,
    "app/src/main/java",
    packageDirPath
  );

  await fs.promises.cp(userJavaDir, androidAppJavaDir, { recursive: true });

  // 3) Paket ismi overwrite edilir (ama kullanıcının kodunu bozmadan)
  const destWidgetFile = path.join(androidAppJavaDir, `${widgetName}.kt`);

  let destContent = fs.readFileSync(destWidgetFile, "utf8");

  destContent = destContent.replace(
    /^package .*\n/,
    `package ${packageName}\n`
  );

  fs.writeFileSync(destWidgetFile, destContent);
}

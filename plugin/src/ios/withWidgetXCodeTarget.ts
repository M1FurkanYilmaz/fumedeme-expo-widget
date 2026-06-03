import { IOSConfig } from "@expo/config-plugins";
import * as util from "util";

interface AddXcodeTargetParams {
  appName: string;
  extensionName: string;
  extensionBundleIdentifier: string;
  currentProjectVersion: string;
  marketingVersion: string;
  devTeamId: string;
}

export const addBroadcastExtensionXcodeTarget = async (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  {
    appName,
    extensionName,
    extensionBundleIdentifier,
    currentProjectVersion,
    marketingVersion,
    devTeamId,
    topLevelFiles,
  }: AddXcodeTargetParams & { topLevelFiles: string[] }
) => {
  if (proj.findTargetKey(extensionName)) {
    console.log(`Target ${extensionName} already exists, skipping...`);
    return;
  }

  const targetUuid = proj.generateUuid();
  const groupName = "Embed App Extensions";

  const xCConfigurationList = addXCConfigurationList(proj, {
    extensionBundleIdentifier,
    currentProjectVersion,
    marketingVersion,
    extensionName,
    appName,
    devTeamId,
  });

  const productFile = addProductFile(proj, extensionName, groupName);

  const target = addToPbxNativeTargetSection(proj, {
    extensionName,
    targetUuid,
    productFile,
    xCConfigurationList,
  });

  addToPbxProjectSection(proj, target);
  addTargetDependency(proj, target, appName);

  proj.addFramework("WidgetKit.framework", {
    target: target.uuid,
    link: false,
  });

  proj.addFramework("SwiftUI.framework", {
    target: target.uuid,
    link: false,
  });

  const frameworkPaths = ["SwiftUI.framework", "WidgetKit.framework"];
  const filesForPbxGroup = topLevelFiles.filter((file) => file !== "Assets.xcassets");

  const groupUuid = addPbxGroup(proj, productFile, extensionName, filesForPbxGroup);

  addBuildPhases(proj, {
    appName,
    extensionName,
    groupName,
    productFile,
    targetUuid,
    frameworkPaths,
    groupUuid,
  });
};

export function quoted(str: string) {
  return util.format('"%s"', str);
}

const addXCConfigurationList = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  {
    extensionBundleIdentifier,
    currentProjectVersion,
    marketingVersion,
    extensionName,
    appName,
    devTeamId,
  }: AddXcodeTargetParams
) => {
  const commonBuildSettings = {
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
    ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "WidgetBackground",
    CLANG_ANALYZER_NONNULL: "YES",
    CLANG_ANALYZER_NUMBER_OBJECT_CONVERSION: "YES_AGGRESSIVE",
    CLANG_CXX_LANGUAGE_STANDARD: quoted("gnu++17"),
    CLANG_ENABLE_OBJC_WEAK: "YES",
    CLANG_WARN_DOCUMENTATION_COMMENTS: "YES",
    CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER: "YES",
    CLANG_WARN_UNGUARDED_AVAILABILITY: "YES_AGGRESSIVE",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: currentProjectVersion,
    DEVELOPMENT_TEAM: devTeamId,
    GCC_C_LANGUAGE_STANDARD: "gnu11",
    GENERATE_INFOPLIST_FILE: "YES",
    INFOPLIST_FILE: `${extensionName}/Info.plist`,
    INFOPLIST_KEY_CFBundleDisplayName: `${extensionName}`,
    INFOPLIST_KEY_NSHumanReadableCopyright: quoted(""),
    // Match modern standards needed for concurrent widget structures
    IPHONEOS_DEPLOYMENT_TARGET: "16.0", 
    LD_RUNPATH_SEARCH_PATHS: quoted(
      "$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"
    ),
    MARKETING_VERSION: marketingVersion,
    MTL_FAST_MATH: "YES",
    PRODUCT_BUNDLE_IDENTIFIER: quoted(extensionBundleIdentifier),
    PRODUCT_NAME: quoted("$(TARGET_NAME)"),
    SKIP_INSTALL: "YES",
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: quoted("1"),
    SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
    SWIFT_OPTIMIZATION_LEVEL: "-Onone",
  };

  const buildConfigurationsList = [
    {
      name: "Debug",
      isa: "XCBuildConfiguration",
      buildSettings: {
        ...commonBuildSettings,
        DEBUG_INFORMATION_FORMAT: "dwarf",
        MTL_ENABLE_DEBUG_INFO: "INCLUDE_SOURCE",
        SWIFT_ACTIVE_COMPILATION_CONDITIONS: "DEBUG",
        SWIFT_OPTIMIZATION_LEVEL: quoted("-Onone"),
      },
    },
    {
      name: "Release",
      isa: "XCBuildConfiguration",
      buildSettings: {
        ...commonBuildSettings,
        COPY_PHASE_STRIP: "NO",
        DEBUG_INFORMATION_FORMAT: quoted("dwarf-with-dsym"),
        SWIFT_OPTIMIZATION_LEVEL: quoted("-Owholemodule"),
      },
    },
  ];

  const xCConfigurationList = proj.addXCConfigurationList(
    buildConfigurationsList,
    "Release",
    `Build configuration list for PBXNativeTarget ${quoted(extensionName)}`
  );

  // Keep this to make sure Swift runtimes are properly linked to the main app
  proj.updateBuildProperty("ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES", "YES", null, appName);
  
  // CRITICAL FIX: Removed the line that forced 'appName' (VoltUp) to IPHONEOS_DEPLOYMENT_TARGET = "15.1"
  // Let your app configuration or expo-widgets dictate the main app deployment target baseline instead.

  return xCConfigurationList;
};

const addProductFile = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  extensionName: string,
  groupName: string
) => {
  const fileRefUuid = proj.generateUuid();
  const buildFileUuid = proj.generateUuid();

  if (!proj.hash.project.objects.PBXFileReference) {
    proj.hash.project.objects.PBXFileReference = {};
  }

  proj.hash.project.objects.PBXFileReference[fileRefUuid] = {
    isa: "PBXFileReference",
    explicitFileType: "wrapper.app-extension",
    includeInIndex: 0,
    path: `${extensionName}.appex`,
    sourceTree: "BUILT_PRODUCTS_DIR",
  };

  proj.hash.project.objects.PBXFileReference[`${fileRefUuid}_comment`] = `${extensionName}.appex`;

  if (!proj.hash.project.objects.PBXBuildFile) {
    proj.hash.project.objects.PBXBuildFile = {};
  }

  proj.hash.project.objects.PBXBuildFile[buildFileUuid] = {
    isa: "PBXBuildFile",
    fileRef: fileRefUuid,
    settings: { ATTRIBUTES: ["RemoveHeadersOnCopy"] },
  };

  proj.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] = `${extensionName}.appex in Embed App Extensions`;

  return {
    basename: `${extensionName}.appex`,
    fileRef: fileRefUuid,
    uuid: buildFileUuid,
    group: groupName,
    explicitFileType: "wrapper.app-extension",
    settings: { ATTRIBUTES: ["RemoveHeadersOnCopy"] },
    includeInIndex: 0,
    path: `${extensionName}.appex`,
    sourceTree: "BUILT_PRODUCTS_DIR",
  };
};

const addToPbxNativeTargetSection = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  { extensionName, targetUuid, productFile, xCConfigurationList }: any
) => {
  const target = {
    uuid: targetUuid,
    pbxNativeTarget: {
      isa: "PBXNativeTarget",
      buildConfigurationList: xCConfigurationList.uuid,
      buildPhases: [],
      buildRules: [],
      dependencies: [],
      name: extensionName,
      productName: extensionName,
      productReference: productFile.fileRef,
      productType: quoted("com.apple.product-type.app-extension"),
    },
  };

  proj.addToPbxNativeTargetSection(target);
  return target;
};

const addToPbxProjectSection = (proj: IOSConfig.XcodeUtils.NativeTargetSection, target: any) => {
  proj.addToPbxProjectSection(target);

  const projectUuid = proj.getFirstProject().uuid;
  if (!proj.pbxProjectSection()[projectUuid].attributes.TargetAttributes) {
    proj.pbxProjectSection()[projectUuid].attributes.TargetAttributes = {};
  }

  proj.pbxProjectSection()[projectUuid].attributes.LastSwiftUpdateCheck = 1340;
  proj.pbxProjectSection()[projectUuid].attributes.TargetAttributes[target.uuid] = {
    CreatedOnToolsVersion: "13.4.1",
    ProvisioningStyle: "Automatic",
  };
};

const addTargetDependency = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  target: any,
  appName: string
) => {
  if (!proj.hash.project.objects["PBXTargetDependency"]) {
    proj.hash.project.objects["PBXTargetDependency"] = {};
  }
  if (!proj.hash.project.objects["PBXContainerItemProxy"]) {
    proj.hash.project.objects["PBXContainerItemProxy"] = {};
  }

  const mainTargetUuid = proj.findTargetKey(appName);
  if (mainTargetUuid) {
    proj.addTargetDependency(mainTargetUuid, [target.uuid]);
  }
};

const addPbxGroup = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  productFile: any,
  extensionName: string,
  topLevelFiles: string[]
): string => {
  const existingGroupUuid = proj.findPBXGroupKey({ name: extensionName });
  if (existingGroupUuid) {
    return existingGroupUuid;
  }

  const { uuid: pbxGroupUuid } = proj.addPbxGroup(topLevelFiles, extensionName, extensionName);

  // Safely grab the Root MainGroup from PBXProject without looping over keys
  const pbxProjectSection = proj.hash.project.objects["PBXProject"];
  const projectKey = Object.keys(pbxProjectSection).find((k) => !k.endsWith("_comment"));
  if (projectKey && pbxGroupUuid) {
    const rootGroupUuid = pbxProjectSection[projectKey].mainGroup;
    proj.addToPbxGroup(pbxGroupUuid, rootGroupUuid);
  }

  // Safely find and update the Products group
  const groups = proj.hash.project.objects["PBXGroup"];
  Object.keys(groups).forEach((key) => {
    if (key.endsWith("_comment") || typeof groups[key] !== "object") return;

    if (groups[key].name === "Products") {
      if (!groups[key].children) groups[key].children = [];
      const alreadyExists = groups[key].children.some((child: any) => {
        const childValue = typeof child === "object" ? child.value : child;
        return childValue === productFile.fileRef;
      });

      if (!alreadyExists) {
        groups[key].children.push({
          value: productFile.fileRef,
          comment: productFile.basename,
        });
      }
    }
  });

  return pbxGroupUuid;
};

const addBuildPhases = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  { productFile, targetUuid, frameworkPaths, extensionName, groupUuid, appName }: any
) => {
  const buildPath = quoted("");
  const swiftFileName = `${extensionName}.swift`;

  proj.addBuildPhase([swiftFileName], "PBXSourcesBuildPhase", "Sources", targetUuid, extensionName, buildPath);

  if (frameworkPaths.length > 0) {
    proj.addBuildPhase(frameworkPaths, "PBXFrameworksBuildPhase", "Frameworks", targetUuid, extensionName, buildPath);
  }

  const assetsFileRefUuid = proj.generateUuid();
  if (!proj.hash.project.objects.PBXFileReference) {
    proj.hash.project.objects.PBXFileReference = {};
  }

  proj.hash.project.objects.PBXFileReference[assetsFileRefUuid] = {
    isa: "PBXFileReference",
    lastKnownFileType: "folder.assetcatalog",
    path: "Assets.xcassets",
    sourceTree: '"<group>"',
  };
  proj.hash.project.objects.PBXFileReference[`${assetsFileRefUuid}_comment`] = "Assets.xcassets";

  const groups = proj.hash.project.objects.PBXGroup;
  if (groups[groupUuid] && groups[groupUuid].children) {
    groups[groupUuid].children.push({
      value: assetsFileRefUuid,
      comment: "Assets.xcassets",
    });
  }

  const assetsBuildFileUuid = proj.generateUuid();
  if (!proj.hash.project.objects.PBXBuildFile) {
    proj.hash.project.objects.PBXBuildFile = {};
  }

  proj.hash.project.objects.PBXBuildFile[assetsBuildFileUuid] = {
    isa: "PBXBuildFile",
    fileRef: assetsFileRefUuid,
  };
  proj.hash.project.objects.PBXBuildFile[`${assetsBuildFileUuid}_comment`] = "Assets.xcassets in Resources";

  const resourcesBuildPhaseUuid = proj.generateUuid();
  if (!proj.hash.project.objects.PBXResourcesBuildPhase) {
    proj.hash.project.objects.PBXResourcesBuildPhase = {};
  }

  proj.hash.project.objects.PBXResourcesBuildPhase[resourcesBuildPhaseUuid] = {
    isa: "PBXResourcesBuildPhase",
    buildActionMask: 2147483647,
    files: [{ value: assetsBuildFileUuid, comment: "Assets.xcassets in Resources" }],
    runOnlyForDeploymentPostprocessing: 0,
  };
  proj.hash.project.objects.PBXResourcesBuildPhase[`${resourcesBuildPhaseUuid}_comment`] = "Resources";

  const target = proj.pbxNativeTargetSection()[targetUuid];
  if (target && target.buildPhases) {
    const hasResourcesPhase = target.buildPhases.some((phase: any) => {
      const phaseValue = typeof phase === "object" ? phase.value : phase;
      const phaseObj = proj.hash.project.objects.PBXResourcesBuildPhase?.[phaseValue];
      return phaseObj && phaseObj.isa === "PBXResourcesBuildPhase";
    });

    if (!hasResourcesPhase) {
      target.buildPhases.push({ value: resourcesBuildPhaseUuid, comment: "Resources" });
    }
  }

  const mainTargetUuid = proj.findTargetKey(appName);
  if (mainTargetUuid) {
    proj.addBuildPhase([productFile.path], "PBXCopyFilesBuildPhase", "Copy Files", mainTargetUuid, "app_extension", buildPath);
  }
};
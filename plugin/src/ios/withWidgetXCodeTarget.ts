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
    console.log("AYNI TARGET BULUNDU: ", extensionName);
    return;
  }

  const targetUuid = proj.generateUuid();
  const groupName = "Embed App Extensions";
  console.log("TARGET ADI ", targetUuid);

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

  addTargetDependency(proj, target);

  const frameworkFileWidgetKit = proj.addFramework("WidgetKit.framework", {
    target: target.uuid,
    link: false,
  });
  const frameworkFileSwiftUI = proj.addFramework("SwiftUI.framework", {
    target: target.uuid,
    link: false,
  });

  addBuildPhases(proj, {
    extensionName,
    groupName,
    productFile,
    targetUuid,
    frameworkPaths: [frameworkFileSwiftUI.path, frameworkFileWidgetKit.path],
  });

  addPbxGroup(proj, productFile, extensionName, topLevelFiles);
};

export function quoted(str: string) {
  return util.format(`"%s"`, str);
}

const addXCConfigurationList = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  {
    extensionBundleIdentifier,
    currentProjectVersion,
    marketingVersion,
    extensionName,
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
    IPHONEOS_DEPLOYMENT_TARGET: "15.1",
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

  // update other build properties
  proj.updateBuildProperty(
    "ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES",
    "YES",
    null,
    proj.getFirstTarget().firstTarget.name
  );

  proj.updateBuildProperty("IPHONEOS_DEPLOYMENT_TARGET", "15.1");

  return xCConfigurationList;
};

const addProductFile = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  extensionName: string,
  groupName: string
) => {
  const fileRefUuid = proj.generateUuid();
  const buildFileUuid = proj.generateUuid();

  // Manually add to PBXFileReference section
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
  proj.hash.project.objects.PBXFileReference[`${fileRefUuid}_comment`] =
    `${extensionName}.appex`;

  // Manually add to PBXBuildFile section
  if (!proj.hash.project.objects.PBXBuildFile) {
    proj.hash.project.objects.PBXBuildFile = {};
  }

  proj.hash.project.objects.PBXBuildFile[buildFileUuid] = {
    isa: "PBXBuildFile",
    fileRef: fileRefUuid,
    settings: {
      ATTRIBUTES: ["RemoveHeadersOnCopy"],
    },
  };
  proj.hash.project.objects.PBXBuildFile[`${buildFileUuid}_comment`] =
    `${extensionName}.appex in Embed App Extensions`;

  const productFile = {
    basename: `${extensionName}.appex`,
    fileRef: fileRefUuid,
    uuid: buildFileUuid,
    group: groupName,
    explicitFileType: "wrapper.app-extension",
    settings: {
      ATTRIBUTES: ["RemoveHeadersOnCopy"],
    },
    includeInIndex: 0,
    path: `${extensionName}.appex`,
    sourceTree: "BUILT_PRODUCTS_DIR",
  };

  return productFile;
};

const addToPbxNativeTargetSection = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  {
    extensionName,
    targetUuid,
    productFile,
    xCConfigurationList,
  }: {
    extensionName: string;
    targetUuid: string;
    productFile: any;
    xCConfigurationList: any;
  }
) => {
  console.log("PBX TARGETE GİRİLDİ: ");
  console.log("extention name: ", extensionName);
  console.log("target uuid: ", targetUuid);
  console.log("product file: ", productFile);
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
  console.log("target: ", target);

  proj.addToPbxNativeTargetSection(target);

  return target;
};

const addToPbxProjectSection = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  target: any
) => {
  proj.addToPbxProjectSection(target);

  // Add target attributes to project section
  if (
    !proj.pbxProjectSection()[proj.getFirstProject().uuid].attributes
      .TargetAttributes
  ) {
    proj.pbxProjectSection()[
      proj.getFirstProject().uuid
    ].attributes.TargetAttributes = {};
  }

  proj.pbxProjectSection()[
    proj.getFirstProject().uuid
  ].attributes.LastSwiftUpdateCheck = 1340;

  proj.pbxProjectSection()[
    proj.getFirstProject().uuid
  ].attributes.TargetAttributes[target.uuid] = {
    CreatedOnToolsVersion: "13.4.1",
    ProvisioningStyle: "Automatic",
  };
};

const addTargetDependency = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  target: any
) => {
  if (!proj.hash.project.objects["PBXTargetDependency"]) {
    proj.hash.project.objects["PBXTargetDependency"] = {};
  }
  if (!proj.hash.project.objects["PBXContainerItemProxy"]) {
    proj.hash.project.objects["PBXContainerItemProxy"] = {};
  }

  proj.addTargetDependency(proj.getFirstTarget().uuid, [target.uuid]);
};

type AddBuildPhaseParams = {
  groupName: string;
  productFile: any;
  targetUuid: string;
  extensionName: string;
  frameworkPaths: string[];
};

const addBuildPhases = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  {
    productFile,
    targetUuid,
    frameworkPaths,
    extensionName,
  }: AddBuildPhaseParams
) => {
  const buildPath = quoted("");
  const swiftFileName = `${extensionName}.swift`;

  // Sources build phase
  proj.addBuildPhase(
    [swiftFileName],
    "PBXSourcesBuildPhase",
    "Sources",
    targetUuid,
    extensionName,
    buildPath
  );

  // Copy files build phase
  proj.addBuildPhase(
    [productFile.path],
    "PBXCopyFilesBuildPhase",
    "Copy Files",
    proj.getFirstTarget().uuid,
    "app_extension",
    buildPath
  );

  // Frameworks build phase
  proj.addBuildPhase(
    frameworkPaths,
    "PBXFrameworksBuildPhase",
    "Frameworks",
    targetUuid,
    extensionName,
    buildPath
  );

  // Resources build phase
  proj.addBuildPhase(
    ["Assets.xcassets"],
    "PBXResourcesBuildPhase",
    "Resources",
    targetUuid,
    extensionName,
    buildPath
  );
};

const addPbxGroup = (
  proj: IOSConfig.XcodeUtils.NativeTargetSection,
  productFile: any,
  extensionName: string,
  topLevelFiles: string[]
) => {
  // Add PBX group
  const { uuid: pbxGroupUuid } = proj.addPbxGroup(
    topLevelFiles,
    extensionName,
    extensionName
  );

  // Add PBXGroup to top level group
  const groups = proj.hash.project.objects["PBXGroup"];

  if (pbxGroupUuid) {
    Object.keys(groups).forEach(function (key) {
      if (groups[key].name === undefined && groups[key].path === undefined) {
        // Add to root group
        proj.addToPbxGroup(pbxGroupUuid, key);
      } else if (groups[key].name === "Products") {
        // Add product file to Products group
        // Don't use addToPbxGroup - directly add the fileRef
        if (!groups[key].children) {
          groups[key].children = [];
        }
        // Check if not already added
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
  }
};

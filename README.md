# fumedeme-expo-widget

A powerful Expo config plugin that enables native Android and iOS widgets with seamless data synchronization between your React Native app and widgets.

## Installation

```bash
npm install fumedeme-expo-widget
```

## Usage

### 1. Configure the Plugin

Add the plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "fumedeme-expo-widget",
        {
          "widgetName": "MyWidget",
          "ios": {
            "devTeamId": "YOUR_TEAM_ID",
            "appGroupIdentifier": "group.com.yourcompany.yourapp"
          }
        }
      ]
    ]
  }
}
```

**Configuration Options:**

- `widgetName`: Name of your widget class (e.g., "MyWidget", "StatusWidget")
- `ios.devTeamId`: Your Apple Developer Team ID
- `ios.appGroupIdentifier`: App Group identifier for iOS (must start with "group.")

Make sure the Group Identifier is same as in your ios entitlements:

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.security.application-groups": [
          "group.com.yourcompany.yourapp"
        ]
      }
    }
  }
}
```

### 2. Prebuild Your App

```bash
npx expo prebuild
```

This generates native widget files in your project that you can customize.

### 3. Use in Your React Native App

```javascript
import { getItem, setItem, reloadAll } from "fumedeme-expo-widget";

// Send data to widget
await setItem("savedData", "Your data here", "group.com.yourcompany.yourapp");

// Reload all widgets to show updated data
await reloadAll();

// Read data from shared storage
const data = await getItem("savedData", "group.com.yourcompany.yourapp");
```

**Key Functions:**

- `setItem(key, value, groupIdentifier)`: Save data that widgets can access
- `getItem(key, groupIdentifier)`: Read data from shared storage
- `reloadAll()`: Force all widgets to refresh and display updated data

## Development Guide

Want to contribute or customize the plugin? Here's how it works:

### Project Structure

```
fumedeme-expo-widget/
├── src/                          # Native module code (TypeScript/Swift/Kotlin)
├── plugin/
│   ├── src/                      # Config plugin source code
│   │   ├── android/static/       # Android widget templates
│   │   └── ios/static/           # iOS widget templates
│   └── build/                    # Built plugin files (generated)
```

### Three Development Areas

#### 1. **Native Module** (`/src`)

The React Native bridge that enables communication between JS and native code.

- Edit TypeScript, Swift, or Kotlin files here
- Handles data synchronization between app and widgets

#### 2. **Config Plugins** (`/plugin/src`)

Automates native project configuration during prebuild.

- `withWidgetAndroid.ts` - Android widget setup
- `withWidgetIOS.ts` - iOS widget setup
- `withWidgetSourceCodes.ts` - Copies and configures widget files

#### 3. **Widget Templates** (`/plugin/src/android/static` & `/plugin/src/ios/static`)

The actual widget implementation files with placeholders.

- `widget.kt` - Android widget template (uses `{{WIDGET_NAME}}`, `{{PACKAGE_NAME}}`, etc.)
- `Widget.swift` - iOS widget template
- Resource files (layouts, assets, etc.)

### Building the Plugin

Run this command to build everything:

```bash
npm run build
```

**What it does:**

1. **Compiles TypeScript** (`tsc -b plugin`) - Builds config plugin code into `/plugin/build`
2. **Builds Native Module** (`expo-module build`) - Compiles the native module
3. **Copies Static Files** (`bash plugin/src/scripts/copy.sh`) - Copies widget templates to `/plugin/build/static`

The `copy.sh` script ensures widget templates are available in the built plugin:

```bash
# Copies iOS templates
mkdir -p plugin/build/ios/static
cp -R plugin/src/ios/static/* plugin/build/ios/static/

# Copies Android templates
mkdir -p plugin/build/android/static
cp -R plugin/src/android/static/* plugin/build/android/static/
```

### Testing Your Changes

1. Make changes to source files
2. Run `npm run build`
3. Test in an example app:
   ```bash
   cd example
   npx expo prebuild --clean
   npx expo run:android  # or run:ios
   ```

## Widget File Management

The plugin intelligently manages widget files based on whether they already exist in your project:

**First Prebuild** (no widget folder exists):

- Creates a folder named after your `widgetName` in project root
- Copies template widget files with placeholders
- Replaces placeholders with your configuration
- You can now customize these files freely

**Subsequent Prebuilds** (widget folder exists):

- **Skips template copy** - your customizations are preserved
- Only copies your existing widget files to native projects
- Applies necessary configuration (package names, bundle IDs, etc.)

This means you can safely modify widget code after the first prebuild without losing changes. Your customized widget files will be used in all future builds.

## How It Works

1. **Prebuild**: Config plugin copies widget templates (first time) or your custom widgets (subsequent times) to native projects
2. **Customization**: Edit widget files in `/{widgetName}` folder - changes persist across prebuilds
3. **Data Sync**: Native module provides JS functions to share data between app and widgets
4. **Updates**: Widgets automatically refresh when you call `reloadAll()` or at system intervals

## License

MIT

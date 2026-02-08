# Tauri Native App

## Development

Mobile layout:

```bash
DX_MOBILE=1 moon run composer-app:serve
```

Desktop app:

```bash
moon run composer-app:tauri-dev
```

## iOS

- XCode > Settings > Components (Get latest iOS)
- https://inspect.dev

### iOS Deployment (Simulator or Physical Device)

The `ios-deploy.sh` script handles both simulator and physical device deployment intelligently:

**Default (simulator - iPhone 17 Pro):**

```bash
./scripts/ios-deploy.sh
```

**Specific simulator:**

```bash
./scripts/ios-deploy.sh "iPhone 16 Pro"
```

**Physical device (requires device to be connected):**

```bash
./scripts/ios-deploy.sh "burdon-iphone"
```

The script automatically detects whether the device name refers to a physical device or simulator.

**Notes:**
- Physical device deployment requires Apple Developer provisioning profiles
- Enable Developer Mode on device: Settings > Privacy & Security > Developer Mode > ON
- Tauri CLI prioritizes physical devices, so disconnect them to use simulators
- When physical devices are connected, you must explicitly specify the device name

**Direct moon command (no device management):**

```bash
moon run composer-app:tauri-ios -- "device-name"
```

## Tools

```bash
brew install cocoapods
pnpm tauri ios init
```

## iOS Keyboard Detection

After running `tauri ios init`, run the setup script to install iOS extensions:

```bash
./scripts/ios-init.sh
```

This copies:
- `KeyboardObserver.swift` - Emits keyboard show/hide events to the webview
- `KeyboardSetup.m` - Auto-initializes observer and disables Input Accessory View using Obj-C `+load`

The observer dispatches `keyboard` CustomEvents to `window` with details:
```typescript
{ type: 'show' | 'hide', height: number, duration: number }
```

## Register iOS Device and Certificate Signing

1. Wait for Xcode to fully load the project
2. In the left sidebar, click on the app project (top item with blue icon)
3. In the main panel, select the app_iOS target from the targets list
4. Click the Signing & Capabilities tab
5. Check the box "Automatically manage signing"
6. In the Team dropdown, select your team (should show "Braneframe, Inc." or similar)

## Logs

XCode > Window > Devices and Simulators (⌘⇧2) > [device] > Open Console

```bash
log stream --predicate 'process == "Composer"' --level debug
```

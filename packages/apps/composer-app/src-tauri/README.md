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

### iOS Simulator

Default (will auto-detect or boot a simulator):

```bash
moon run composer-app:tauri-ios
```

With specific simulator:

```bash
./scripts/ios-sim.sh "iPhone 17 Pro"
```

Or directly:

```bash
moon run composer-app:tauri-ios -- "iPhone 17 Pro"
```

### Physical Device (USB)

Auto-detect first connected device:

```bash
./scripts/ios-device.sh
```

Or specify device name:

```bash
./scripts/ios-device.sh "burdon-iphone"
```

Or directly:

```bash
moon run composer-app:tauri-ios -- "burdon-iphone"
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

## Register iOS Device and Certificat Signing

1. Wait for Xcode to fully load the project
2. In the left sidebar, click on the app project (top item with blue icon)
3. In the main panel, select the app_iOS target from the targets list
4. Click the Signing & Capabilities tab
5. Check the box "Automatically manage signing"
6. In the Team dropdown, select your team (should show "Braneframe, Inc." or similar)

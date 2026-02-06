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

```bash
moon run composer-app:tauri-ios
```

With the iOS Simulator:

```bash
moon run composer-app:tauri-ios -- "iPhone 17 Pro"
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

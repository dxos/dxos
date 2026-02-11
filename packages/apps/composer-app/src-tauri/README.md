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

## CI/CD

The Tauri app is built and published via GitHub Actions in `.github/workflows/publish-tauri.yaml`.

### iOS Build Process

The iOS build job (`build_tauri_ios`) follows this sequence:

1. **Setup Environment**
   - Checkout code with LFS
   - Install Homebrew tools (including `xcodegen`)
   - Setup pnpm, moon, Rust toolchain, and Xcode 16.4
   - Configure Apple API keys for App Store Connect

2. **Initialize iOS Project** (Critical Step)
   ```bash
   pnpm tauri ios init --ci
   ./scripts/ios-init.sh
   ```

   This step is **required before every build** because:
   - The Xcode project in `gen/apple/` is generated, not committed to git
   - `tauri ios init` regenerates the project with correct build configuration paths
   - `ios-init.sh` installs custom plugins (KeyboardHandler) and runs `xcodegen`
   - Without this, the build fails with "libapp.a not found" due to debug/release path mismatch

3. **Build for App Store**
   ```bash
   moon run composer-app:tauri-ios-build -- --export-method=app-store-connect
   ```

   Builds in release mode and creates an IPA ready for App Store Connect.

4. **Upload Assets**
   - Uploads to CrabNebula Cloud for distribution
   - Uploads to App Store Connect via `xcrun altool` (labs branch only)

### Configuration Management

**Build Modes:**
- `tauri ios build` → Release mode (default, used in CI)
- `tauri ios build --debug` → Debug mode (development)

**Important:** The Xcode project must be regenerated when:
- Switching between debug/release builds
- After modifying Tauri configuration
- When the project structure changes

The build script outputs to `Externals/{arch}/${CONFIGURATION}/libapp.a` where `${CONFIGURATION}` is "debug" or "release". The initialization step ensures Xcode project file references match the actual build configuration.

### Desktop Builds

Desktop builds (`build_tauri` job) support macOS, Linux, and Windows:
- Build with code signing for macOS (Apple Developer certificate)
- Generate updater artifacts via CrabNebula
- Upload to CrabNebula Cloud for auto-updates

### Publishing

After all builds complete, the `publish_tauri` job publishes the release to CrabNebula Cloud, making it available for distribution and auto-updates.

### Testing iOS Build Locally

To test the full iOS build process locally (simulating CI), use the build script:

**Quick Start:**
```bash
# Full App Store release build
./scripts/ios-build.sh

# Simulator build (faster, no code signing)
./scripts/ios-build.sh --sim

# Debug simulator build
./scripts/ios-build.sh --debug --sim

# Skip clean step (faster iteration)
./scripts/ios-build.sh --skip-clean --sim
```

**Manual Steps (what the script does):**

**1. Clean Start:**
```bash
cd packages/apps/composer-app
rm -rf src-tauri/gen/apple
```

**2. Run Initialization (same as CI):**
```bash
pnpm install
pnpm tauri ios init --ci
./scripts/ios-init.sh
```

**3. Build for Release:**
```bash
# Full App Store build (requires code signing)
pnpm tauri ios build --export-method=app-store-connect

# Or build for simulator (faster, no code signing)
pnpm tauri ios build --target aarch64-sim
```

**4. Verify Build Artifacts:**
```bash
# Check library was created in release directory
ls -la src-tauri/gen/apple/Externals/arm64/release/libapp.a

# Check custom plugin was installed
ls -la src-tauri/gen/apple/Sources/app/KeyboardHandler.m

# Check IPA was created (app-store-connect build only)
ls -la src-tauri/gen/apple/build/arm64/*.ipa
```

**Expected Results:**
- ✅ No "libapp.a not found" errors
- ✅ IPA file created successfully
- ✅ Xcode project includes KeyboardHandler.m

**Debugging:**
```bash
# Check Xcode project file references
grep -A 2 "path = debug\|path = release" src-tauri/gen/apple/app.xcodeproj/project.pbxproj

# Find library locations
find src-tauri/gen/apple/Externals -name "libapp.a"

# Verbose build output
pnpm tauri ios build --verbose
```

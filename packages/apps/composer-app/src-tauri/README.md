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

The Tauri app is built and published via GitHub Actions in `.github/workflows/deploy-tauri.yaml`.

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
- Sign each channel under its own App ID when it has one (see below)
- Generate updater artifacts via CrabNebula
- Upload to CrabNebula Cloud for auto-updates

### macOS signing per channel

Native passkeys only work when the app's signed `com.apple.application-identifier` names its own bundle
ID, and `composer.space` lists that App ID under `webcredentials` (`src/functions/_worker.ts`). Each
non-production channel installs under a suffixed bundle ID (`org.dxos.composer.preview`), so it needs
its own App ID and provisioning profile.

Dev and preview embed their own profile (the `MACOS_PROVISION_PROFILE_DEV` and
`MACOS_PROVISION_PROFILE_PREVIEW` secrets); any other build embeds production's
(`MACOS_PROVISION_PROFILE`). The app is signed under whichever App ID its profile grants, so production
and staging stay signed as production, and the app turns native passkeys off at runtime wherever that App
ID does not name its bundle. The release fails if the signature and the profile disagree, if any channel
other than staging is not signed for its own bundle, or if the profile does not list the certificate the
app is signed with. The channel profiles outlive that certificate, so rotating `MACOS_CERTIFICATE` means
regenerating them and updating their secrets.

To give a channel its own identity: register an explicit App ID for its bundle ID with Associated
Domains, create a Developer ID profile for it with the certificate CI signs with, store it base64-encoded
as a `MACOS_PROVISION_PROFILE_<CHANNEL>` secret, select it in `deploy-tauri.yaml`, and add the App ID to
`CHANNEL_BUNDLE_IDS` in `_worker.ts`. For staging, also drop its exemption from the release check in
`deploy-tauri.yaml`. The AASA change only takes effect once the production web app is deployed.

### iOS passkeys

The iOS app creates and redeems `composer.space` passkeys through AuthenticationServices
(`ios/PasskeyBridge.m`, `src/passkey/ios.rs`), never WebAuthn: its page origin is `tauri://localhost`.
That needs the `webcredentials:composer.space` associated domain. `gen/apple/project.yml` declares it,
`xcodegen` writes it into `gen/apple/app_iOS/app_iOS.entitlements`, and `scripts/ios-init.sh` adds it
again after a clean regenerates the project from Tauri's template. The domain side is done: the
`composer.space` AASA already lists `9428WC5MR8.org.dxos.composer` under `webcredentials`. iOS has one
App ID for every channel, so there is nothing to register per channel.

The signing side is manual, and has to land before the next iOS build: until the profile carries the
capability, signing fails with `Provisioning profile "..." doesn't support the Associated Domains
capability`.

1. In the Apple Developer portal, under Certificates, Identifiers & Profiles > Identifiers, open the
   `org.dxos.composer` App ID and enable **Associated Domains**. Save; Apple marks the profiles that
   use the App ID invalid.
2. Under Profiles, edit the App Store distribution profile for `org.dxos.composer` that CI signs with,
   regenerate it, and download it.
3. Store it base64-encoded (`base64 -i <profile>.mobileprovision | pbcopy`) as the `IOS_MOBILE_PROVISION`
   repository secret.
4. Regenerate any development profile used for device builds too, or let Xcode's automatic signing
   pick the capability up.

To check a build, run `codesign -d --entitlements - <Composer.app>` and look for
`com.apple.developer.associated-domains`. On a device, a missing association surfaces as
`ASAuthorizationError` 1004 ("Unable to verify webcredentials association"), reported as a failed
login rather than a dismissed prompt. The simulator needs enrolled Face ID (Features > Face ID) before
it offers to save a passkey.

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

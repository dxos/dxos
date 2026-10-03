#!/bin/bash
#
# Setup iOS native extensions for the Tauri app.
# Run this after `tauri ios init` to copy Swift files to the generated iOS project.
#
# NOTE: This script is called by CI.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_TAURI="$SCRIPT_DIR/../src-tauri"
IOS_SOURCES="$SRC_TAURI/gen/apple/Sources/app"

if [ ! -d "$IOS_SOURCES" ]; then
  echo "Error: iOS sources not found at $IOS_SOURCES"
  echo "Run 'pnpm tauri ios init' first."
  exit 1
fi

#
# Generate icons
#

echo "Generating icons..."

pnpm tauri icon assets/icon-1024.png

#
# Extensions
#

echo "Copying iOS extensions to $IOS_SOURCES..."

# Copy keyboard handler (pure Obj-C, auto-initializes via +load).
cp "$SRC_TAURI/ios/KeyboardHandler.m" "$IOS_SOURCES/"

# Native microphone capture bridged into the webview (simulator development aid).
cp "$SRC_TAURI/ios/MicrophoneBridge.m" "$IOS_SOURCES/"

# Native passkey ceremonies (src/passkey/ios.rs).
cp "$SRC_TAURI/ios/PasskeyBridge.m" "$IOS_SOURCES/"

#
# Regenerate Xcode project to include new files.
#

echo "Regenerating Xcode project..."
(cd "$SRC_TAURI/gen/apple" && xcodegen)

#
# Entitlements
#

# Native passkeys need the composer.space association. The tracked project.yml declares it; a freshly
# generated one (after `ios-build.sh` cleans gen/apple) does not, so it is ensured after xcodegen.
ENTITLEMENTS="$SRC_TAURI/gen/apple/app_iOS/app_iOS.entitlements"
ASSOCIATED_DOMAINS="com.apple.developer.associated-domains"
WEBCREDENTIALS="webcredentials:composer.space"

if ! /usr/libexec/PlistBuddy -c "Print :$ASSOCIATED_DOMAINS" "$ENTITLEMENTS" > /dev/null 2>&1; then
  /usr/libexec/PlistBuddy -c "Add :$ASSOCIATED_DOMAINS array" "$ENTITLEMENTS"
fi
if ! /usr/libexec/PlistBuddy -c "Print :$ASSOCIATED_DOMAINS" "$ENTITLEMENTS" | grep -qx "    $WEBCREDENTIALS"; then
  /usr/libexec/PlistBuddy -c "Add :$ASSOCIATED_DOMAINS: string $WEBCREDENTIALS" "$ENTITLEMENTS"
fi

echo "Done."

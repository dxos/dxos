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

#
# Regenerate Xcode project to include new files.
#

echo "Regenerating Xcode project..."
(cd "$SRC_TAURI/gen/apple" && xcodegen)

echo "Done."

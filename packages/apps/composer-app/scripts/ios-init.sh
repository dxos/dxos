#!/bin/bash
#
# Setup iOS native extensions for the Tauri app.
# Run this after `tauri ios init` to copy Swift files to the generated iOS project.
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

echo "Copying iOS extensions to $IOS_SOURCES..."

# Copy keyboard observer for native keyboard height detection.
cp "$SRC_TAURI/ios/KeyboardObserver.swift" "$IOS_SOURCES/"

echo "Done. iOS extensions installed."

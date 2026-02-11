#!/bin/bash

# Unified iOS deployment script for simulators and physical devices.
#
# Usage:
#   ./scripts/ios-deploy.sh                    # Use default simulator (iPhone 17 Pro)
#   ./scripts/ios-deploy.sh "iPhone 16 Pro"    # Use specific simulator
#   ./scripts/ios-deploy.sh "burdon-iphone"    # Use physical device (if connected)
#
# By default, uses the iPhone 17 Pro simulator.
# If a device name matching a connected physical device is provided, deploys to that device.

set -e

DEVICE_NAME="${1:-iPhone 17 Pro}"

# Get list of physical devices.
PHYSICAL_DEVICES=$(xcrun xctrace list devices 2>&1 | grep -iE 'iphone|ipad' | grep -v 'Simulator' || true)

# Check if the requested device is a physical device.
IS_PHYSICAL_DEVICE=false
if echo "$PHYSICAL_DEVICES" | grep -qi "$DEVICE_NAME"; then
  IS_PHYSICAL_DEVICE=true
fi

if [ "$IS_PHYSICAL_DEVICE" = true ]; then
  # Deploy to physical device.
  echo "📱 Deploying to physical device: $DEVICE_NAME"
  echo "   This will take a few minutes on first run."
  echo ""
  echo "   Note: Requires Apple Developer provisioning profiles."
  echo "   See: Settings > Privacy & Security > Developer Mode > ON"
  echo ""

  moon run composer-app:tauri-ios -- "$DEVICE_NAME"
else
  # Deploy to simulator.
  echo "📱 Deploying to simulator: $DEVICE_NAME"
  echo ""

  # Find the UUID of a booted simulator with this name, or boot one.
  DEVICE_UUID=$(xcrun simctl list devices available | grep "$DEVICE_NAME" | grep "Booted" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

  if [ -z "$DEVICE_UUID" ]; then
    # No booted device found, find the first available one and boot it.
    DEVICE_UUID=$(xcrun simctl list devices available | grep "$DEVICE_NAME" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
    if [ -n "$DEVICE_UUID" ]; then
      echo "   Booting simulator..."
      xcrun simctl boot "$DEVICE_UUID" 2>/dev/null || true
    else
      echo "❌ Error: Simulator not found: '$DEVICE_NAME'"
      echo ""
      echo "Available simulators:"
      xcrun simctl list devices available | grep -iE 'iphone|ipad' | sed 's/^/     /'
      exit 1
    fi
  fi

  moon run composer-app:tauri-ios -- "$DEVICE_NAME"
fi

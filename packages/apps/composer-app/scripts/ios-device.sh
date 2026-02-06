#!/bin/bash

# Deploy to physical iOS device via USB.
# Usage: ./scripts/ios-device.sh [device-name]
# If no device name is provided, uses the first connected physical device.

# Settings > Privacy & Security > Developer Mode > ON
 
set -e

DEVICE_NAME="${1}"

if [ -z "$DEVICE_NAME" ]; then
  # No device specified, find the first physical device (excludes simulators).
  DEVICE_NAME=$(xcrun xctrace list devices 2>&1 | grep -i "iphone" | grep -v "Simulator" | head -1 | sed -E 's/^([^(]+).*/\1/' | xargs)

  if [ -z "$DEVICE_NAME" ]; then
    echo "❌ Error: No physical iOS device found."
    echo ""
    echo "Please ensure:"
    echo "  1. Your iPhone is connected via USB"
    echo "  2. You've trusted this computer on your iPhone"
    echo "  3. Your device is unlocked"
    echo ""
    echo "Available devices:"
    xcrun xctrace list devices 2>&1 | grep -i "iphone" | grep -v "Simulator" | sed 's/^/  /'
    exit 1
  fi

  echo "✓ Using device: $DEVICE_NAME"
fi

echo ""
echo "📱 Deploying to device..."
echo "   This will take a few minutes on first run."
echo ""

# Run tauri ios dev with the device name.
# The trailing arguments (if any) will be passed to the runner.
moon run composer-app:tauri-ios -- "$DEVICE_NAME"

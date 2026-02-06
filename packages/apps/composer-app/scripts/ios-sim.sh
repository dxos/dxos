#!/bin/bash

DEVICE_NAME="${1:-iPhone 17 Pro}"

# Find the UUID of a booted device with this name, or the first available one.
DEVICE_UUID=$(xcrun simctl list devices available | grep "$DEVICE_NAME" | grep "Booted" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

if [ -z "$DEVICE_UUID" ]; then
  # No booted device found, find the first available one and boot it.
  DEVICE_UUID=$(xcrun simctl list devices available | grep "$DEVICE_NAME" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')
  if [ -n "$DEVICE_UUID" ]; then
    xcrun simctl boot "$DEVICE_UUID" 2>/dev/null || true
  else
    echo "Error: Device not found: '$DEVICE_NAME'"
    exit 1
  fi
fi

moon run composer-app:tauri-ios -- "$DEVICE_NAME"

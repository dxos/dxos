#!/bin/bash

DEVICE="${1:-iPhone 17 Pro}"

# Find and boot the device if it's shut down.
xcrun simctl boot "$DEVICE" 2>/dev/null || true
moon run composer-app:tauri-ios -- "$DEVICE"

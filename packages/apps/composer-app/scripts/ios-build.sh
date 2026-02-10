#!/bin/bash
#
# Clean build script for iOS Tauri app.
# Simulates the CI build process locally.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/.."
SRC_TAURI="$APP_DIR/src-tauri"
GEN_APPLE="$SRC_TAURI/gen/apple"

# Parse arguments
BUILD_TARGET="release"
EXPORT_METHOD="app-store-connect"
SKIP_CLEAN=false
VERBOSE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --debug)
      BUILD_TARGET="debug"
      shift
      ;;
    --sim|--simulator)
      EXPORT_METHOD="simulator"
      shift
      ;;
    --skip-clean)
      SKIP_CLEAN=true
      shift
      ;;
    -v|--verbose)
      VERBOSE="--verbose"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Clean build script for iOS Tauri app (simulates CI process)."
      echo ""
      echo "Options:"
      echo "  --debug           Build in debug mode (default: release)"
      echo "  --sim, --simulator Build for simulator (faster, no code signing)"
      echo "  --skip-clean      Skip cleaning generated files"
      echo "  -v, --verbose     Enable verbose output"
      echo "  -h, --help        Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                          # Full App Store release build"
      echo "  $0 --sim                    # Simulator build (faster)"
      echo "  $0 --debug --sim            # Debug simulator build"
      echo "  $0 --skip-clean --sim       # Skip clean, build for simulator"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage information."
      exit 1
      ;;
  esac
done

echo "=========================================="
echo "iOS Clean Build Script"
echo "=========================================="
echo "Build target: $BUILD_TARGET"
echo "Export method: $EXPORT_METHOD"
echo "Working directory: $APP_DIR"
echo ""

# Step 1: Clean generated files
if [ "$SKIP_CLEAN" = false ]; then
  echo "Step 1: Cleaning generated iOS project..."
  if [ -d "$GEN_APPLE" ]; then
    rm -rf "$GEN_APPLE"
    echo "  ✓ Removed $GEN_APPLE"
  else
    echo "  ✓ No existing project to clean"
  fi
  echo ""
else
  echo "Step 1: Skipping clean (--skip-clean flag set)"
  echo ""
fi

# Step 2: Install dependencies
echo "Step 2: Installing dependencies..."
cd "$APP_DIR"
pnpm install
echo "  ✓ Dependencies installed"
echo ""

# Step 3: Initialize iOS project
echo "Step 3: Initializing iOS project..."
pnpm tauri ios init --ci
echo "  ✓ Tauri iOS project initialized"
echo ""

# Step 4: Install custom plugin
echo "Step 4: Installing custom iOS plugin..."
"$SCRIPT_DIR/ios-init.sh"
echo ""

# Step 5: Build
echo "Step 5: Building iOS app..."
if [ "$EXPORT_METHOD" = "simulator" ]; then
  echo "Building for simulator (aarch64-sim)..."
  if [ "$BUILD_TARGET" = "debug" ]; then
    pnpm tauri ios build --target aarch64-sim --debug $VERBOSE
  else
    pnpm tauri ios build --target aarch64-sim $VERBOSE
  fi
else
  echo "Building for App Store Connect..."
  if [ "$BUILD_TARGET" = "debug" ]; then
    pnpm tauri ios build --export-method="$EXPORT_METHOD" --debug $VERBOSE
  else
    pnpm tauri ios build --export-method="$EXPORT_METHOD" $VERBOSE
  fi
fi
echo ""

# Step 6: Verify build artifacts
echo "Step 6: Verifying build artifacts..."

# Check library
if [ "$BUILD_TARGET" = "debug" ]; then
  LIB_PATH="$GEN_APPLE/Externals/arm64/debug/libapp.a"
else
  LIB_PATH="$GEN_APPLE/Externals/arm64/release/libapp.a"
fi

if [ -f "$LIB_PATH" ]; then
  echo "  ✓ Library found: $LIB_PATH"
else
  echo "  ✗ Library not found: $LIB_PATH"
  exit 1
fi

# Check custom plugin
PLUGIN_PATH="$GEN_APPLE/Sources/app/KeyboardHandler.m"
if [ -f "$PLUGIN_PATH" ]; then
  echo "  ✓ Custom plugin installed: $PLUGIN_PATH"
else
  echo "  ✗ Custom plugin not found: $PLUGIN_PATH"
  exit 1
fi

# Check IPA (for non-simulator builds)
if [ "$EXPORT_METHOD" != "simulator" ]; then
  IPA_PATH="$GEN_APPLE/build/arm64/Composer.ipa"
  if [ -f "$IPA_PATH" ]; then
    IPA_SIZE=$(ls -lh "$IPA_PATH" | awk '{print $5}')
    echo "  ✓ IPA created: $IPA_PATH ($IPA_SIZE)"
  else
    echo "  ⚠ IPA not found (this may be expected for some build types)"
  fi
fi

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
echo ""
echo "Build artifacts:"
echo "  - Library: $LIB_PATH"
echo "  - Plugin: $PLUGIN_PATH"
if [ "$EXPORT_METHOD" != "simulator" ] && [ -f "$IPA_PATH" ]; then
  echo "  - IPA: $IPA_PATH"
fi
echo ""

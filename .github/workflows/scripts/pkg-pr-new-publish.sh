#!/bin/bash

# Find all public packages (not private) using pnpm and pass them to pkg-pr-new publish
# This script uses pnpm's --filter-prod to get only production (non-private) packages

set -e

echo "Finding public packages..."

# Use pnpm to list all production packages (non-private) and extract their paths
# --filter-prod filters out packages with "private": true
# --depth=-1 gets all nested packages
# --json outputs JSON format
PUBLIC_PACKAGES=$(pnpm list --filter-prod="./packages/**" --filter-prod="./vendor/**" --depth=-1 --json 2>/dev/null | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
    const packages = Array.isArray(data) ? data : [data];
    const publicPkgs = packages
      .filter(pkg => !pkg.private && pkg.path)
      .map(pkg => pkg.path)
      .filter(Boolean);
    console.log(publicPkgs.join(' '));
  ")

if [ -z "$PUBLIC_PACKAGES" ]; then
  echo "No public packages found to publish"
  exit 1
fi

# Convert to array
read -ra PKG_ARRAY <<< "$PUBLIC_PACKAGES"
echo "Found ${#PKG_ARRAY[@]} public packages to publish"

# `@dxos/cli` publishes generated packages — a launcher plus one prebuilt binary per platform, written
# to dist/ by `cli:bundle` — rather than its own source directory, which is private and has no binary.
# They are not workspace members, so the pnpm listing above can never see them.
CLI_DIST=packages/devtools/cli/dist
# nullglob so an unmatched `cli-*` drops out instead of reaching pkg-pr-new as a literal path.
shopt -s nullglob
CLI_PLATFORM_PACKAGES=("$CLI_DIST"/cli-*)
shopt -u nullglob

# Fail rather than publish a CLI-less preview — a per-commit CLI build going missing unnoticed is the
# gap this publish exists to close.
if [ ! -d "$CLI_DIST/cli" ] || [ ${#CLI_PLATFORM_PACKAGES[@]} -eq 0 ]; then
  echo "No generated CLI packages in $CLI_DIST — run 'moon run cli:bundle' first"
  exit 1
fi

CLI_PACKAGES=("$CLI_DIST/cli" "${CLI_PLATFORM_PACKAGES[@]}")
echo "Found ${#CLI_PACKAGES[@]} generated CLI packages to publish"

# Run pkg-pr-new publish with all public packages
pnpm dlx pkg-pr-new publish --pnpm "${PKG_ARRAY[@]}" "${CLI_PACKAGES[@]}"


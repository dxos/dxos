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

# Run pkg-pr-new publish with all public packages
pnpm dlx pkg-pr-new publish --pnpm "${PKG_ARRAY[@]}"


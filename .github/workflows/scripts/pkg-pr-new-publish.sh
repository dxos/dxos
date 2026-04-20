#!/bin/bash

# Find all public packages (not private) and pass them to pkg-pr-new publish.
# Reads package.json files from packages/ and vendor/ and filters out private packages.

set -e

echo "Finding public packages..."

PUBLIC_PACKAGES=$(node -e "
  const fs = require('fs');
  const path = require('path');
  const { globSync } = require('glob');
  const patterns = ['packages/**/package.json', 'vendor/**/package.json'];
  const ignore = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**'];
  const dirs = [];
  for (const pattern of patterns) {
    for (const file of globSync(pattern, { ignore })) {
      const pkg = JSON.parse(fs.readFileSync(file, 'utf-8'));
      if (!pkg.private) {
        dirs.push(path.dirname(file));
      }
    }
  }
  console.log(dirs.join(' '));
")

if [ -z "$PUBLIC_PACKAGES" ]; then
  echo "No public packages found to publish"
  exit 1
fi

# Convert to array.
read -ra PKG_ARRAY <<< "$PUBLIC_PACKAGES"
echo "Found ${#PKG_ARRAY[@]} public packages to publish"

# Run pkg-pr-new publish with all public packages.
bunx pkg-pr-new publish "${PKG_ARRAY[@]}"

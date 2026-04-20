#!/bin/bash

# Check if package name is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <package-name>"
  exit 1
fi

package_name="$1"

# Run bun why and extract version numbers using regex.
# Escape regex-special chars (e.g., slashes in scoped names) before interpolating.
# The regex matches "<name>@<version>" where version accepts digits, dots, hyphens (prereleases), and +build metadata.
escaped_name=$(printf '%s\n' "$package_name" | sed 's|[][\\.^$*/]|\\&|g')

bun why "$package_name" |
  grep -oE "${escaped_name}@[0-9][0-9A-Za-z.+-]*" |
  sed "s|${package_name}@||g" |
  sort -u -V

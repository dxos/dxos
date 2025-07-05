#!/bin/bash

# Check if package name is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <package-name>"
  exit 1
fi

package_name="$1"

# Run pnpm why and extract version numbers using regex
# The regex looks for the package name followed by an @ and version number
pnpm why -r "$package_name" |
  grep -o "$package_name [~^]\?[0-9][0-9.]*" |
  sed "s|$package_name ||g" |
  sort -u -V

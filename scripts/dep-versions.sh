#!/bin/bash

# Check if package name is provided
if [ $# -eq 0 ]; then
  echo "Usage: $0 <package-name>"
  exit 1
fi

package_name="$1"

# Run bun pm why and extract version numbers using regex.
# The regex looks for the package name followed by @ and version number.
bun pm why "$package_name" |
  grep -o "$package_name@[0-9][0-9.]*" |
  sed "s|$package_name@||g" |
  sort -u -V

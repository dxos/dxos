#!/bin/sh

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check if lychee is installed
if ! command_exists lychee; then
  echo "Error: lychee is not installed. Please install it before running this script."
  exit 1
fi

# Find the git root directory
GIT_ROOT=$(git rev-parse --show-toplevel)

# Check if git root was found
if [ -z "$GIT_ROOT" ]; then
  echo "Error: Could not find the dxos git root directory. Make sure this script is run within a the dxos repository."
  exit 1
fi

# Construct the paths relative to the git root
CONTENT_COMPOSER="$GIT_ROOT/docs/content/composer"
CONTENT_GUIDE="$GIT_ROOT/docs/content/guide"

# Run lychee with the constructed paths
lychee --offline "$CONTENT_COMPOSER" "$CONTENT_GUIDE"

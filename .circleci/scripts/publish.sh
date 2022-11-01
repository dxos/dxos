#!/bin/bash

BRANCH=$(git branch --show-current)
ROOT=$(git rev-parse --show-toplevel)

if [ $BRANCH = "release" ]; then
  export DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config.yml"

  VERSION=$(cat package.json | jq '.version')

  $ROOT/packages/devtools/dx-cli/bin/run app publish \
    --version $VERSION
    --skipExisting
    --verbose
else
  export DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config-dev.yml"
  $ROOT/packages/devtools/dx-cli/bin/run app publish --verbose
fi

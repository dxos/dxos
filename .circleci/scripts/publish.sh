#!/bin/bash

BRANCH=$(git branch --show-current)
ROOT=$(git rev-parse --show-toplevel)

if [ $BRANCH = "release" ]; then
  export DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config.yml"
else
  export REMOTE_SOURCE="https://halo.dev.dxos.org/headless.html"
  export DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config-dev.yml"
fi

$ROOT/packages/devtools/dx-cli/bin/run app publish --verbose

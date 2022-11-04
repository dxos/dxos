#!/bin/bash

BRANCH=$(git branch --show-current)
ROOT=$(git rev-parse --show-toplevel)
PACKAGE=${PWD##*/}
PACKAGE_CAPS=${PACKAGE^^}
PACKAGE_ENV=${PACKAGE_CAPS//-/_}

if [ $BRANCH = "release" ]; then
  eval "export SENTRY_DESTINATION=$"${PACKAGE_ENV}_SENTRY_DSN""
  eval "export TELEMETRY_API_KEY=$"${PACKAGE_ENV}_SEGMENT_API_KEY""
  export DX_ENVIRONMENT=production
  DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config.yml"
  VERSION=$(cat package.json | jq '.version')

  $ROOT/packages/devtools/dx-cli/bin/run app publish \
    --config=$DX_CONFIG \
    --version=$VERSION \
    --skipExisting \
    --verbose
else
  eval "export SENTRY_DESTINATION=$"${PACKAGE_ENV}_DEV_SENTRY_DSN""
  eval "export TELEMETRY_API_KEY=$"${PACKAGE_ENV}_DEV_SEGMENT_API_KEY""
  export DX_ENVIRONMENT=development
  DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config-dev.yml"

  $ROOT/packages/devtools/dx-cli/bin/run app publish \
    --config=$DX_CONFIG \
    --verbose
fi

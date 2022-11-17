#!/bin/bash

ROOT=$(git rev-parse --show-toplevel)
PACKAGE=${PWD##*/}
PACKAGE_CAPS=${PACKAGE^^}
PACKAGE_ENV=${PACKAGE_CAPS//-/_}

eval "export SENTRY_DESTINATION=$"${PACKAGE_ENV}_SENTRY_DSN""
eval "export TELEMETRY_API_KEY=$"${PACKAGE_ENV}_SEGMENT_API_KEY""

if [ $1 = "production" ]; then
  export DX_ENVIRONMENT=production
  DX_CONFIG="$ROOT/packages/devtools/cli/config/config.yml"
  VERSION=$(cat package.json | jq -r '.version')

  $ROOT/packages/devtools/cli/bin/run app publish \
    --config=$DX_CONFIG \
    --version=$VERSION \
    --skipExisting \
    --verbose
else
  export DX_ENVIRONMENT=development
  DX_CONFIG="$ROOT/packages/devtools/cli/config/config-dev.yml"

  $ROOT/packages/devtools/cli/bin/run app publish \
    --config=$DX_CONFIG \
    --verbose
fi

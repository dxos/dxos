#!/bin/bash

BRANCH=$(git branch --show-current)
ROOT=$(git rev-parse --show-toplevel)
PACKAGE=${PWD##*/}
PACKAGE_CAPS=${PACKAGE^^}
PACKAGE_ENV=${PACKAGE_CAPS//-/_}

if [ $BRANCH = "release" ]; then
  export DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config.yml"
  eval "export SENTRY_DESTINATION=$"${PACKAGE_ENV}_SENTRY_DSN""
  eval "export TELEMETRY_API_KEY=$"${PACKAGE_ENV}_SEGMENT_API_KEY""
  export DX_ENVIRONMENT=production
else
  export DX_CONFIG="$ROOT/packages/devtools/dx-cli/config/config-dev.yml"
  eval "export SENTRY_DESTINATION=$"${PACKAGE_ENV}_DEV_SENTRY_DSN""
  eval "export TELEMETRY_API_KEY=$"${PACKAGE_ENV}_DEV_SEGMENT_API_KEY""
  export DX_ENVIRONMENT=dev
fi

echo "Publishing $PACKAGE..."
echo "Environment: $DX_ENVIRONMENT"

$ROOT/packages/devtools/dx-cli/bin/run app publish --verbose

#!/bin/bash

# Configure endpoints here:
# https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/dxos.org/dns/records

APPS=(
  ./packages/apps/composer-app
  ./packages/apps/halo-app
  ./packages/apps/labs-app
  ./packages/apps/tasks-app
  ./packages/apps/todomvc
  ./packages/devtools/devtools
  ./packages/experimental/kai
  ./packages/experimental/kube-console
  ./docs
)

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ROOT=$(git rev-parse --show-toplevel)

for APP in "${APPS[@]}"; do
  pushd $APP

  PACKAGE=${PWD##*/}
  PACKAGE_CAPS=${PACKAGE^^}
  PACKAGE_ENV=${PACKAGE_CAPS//-/_}

  if [ $BRANCH = "production" ]; then
    export DX_ENVIRONMENT=production
    DX_CONFIG="$ROOT/packages/devtools/cli/config/config.yml"
    VERSION=$(cat package.json | jq -r ".version")

    eval "export DX_SENTRY_DESTINATION=$"${PACKAGE_ENV}_SENTRY_DSN""
    eval "export DX_TELEMETRY_API_KEY=$"${PACKAGE_ENV}_SEGMENT_API_KEY""

    $ROOT/packages/devtools/cli/bin/run app publish \
      --config=$DX_CONFIG \
      --accessToken=$KUBE_ACCESS_TOKEN \
      --version=$VERSION \
      --skipExisting \
      --verbose
  elif [ $BRANCH = "staging" ]; then
    export DX_ENVIRONMENT=staging
    export REMOTE_SOURCE=https://halo.staging.dxos.org/vault.html
    DX_CONFIG="$ROOT/packages/devtools/cli/config/config-staging.yml"
    VERSION=$(cat package.json | jq -r ".version")

    $ROOT/packages/devtools/cli/bin/run app publish \
      --config=$DX_CONFIG \
      --accessToken=$KUBE_ACCESS_TOKEN \
      --version=$VERSION \
      --verbose
  else
    export DX_ENVIRONMENT=development
    export REMOTE_SOURCE=https://halo.dev.dxos.org/vault.html
    DX_CONFIG="$ROOT/packages/devtools/cli/config/config-dev.yml"

    $ROOT/packages/devtools/cli/bin/run app publish \
      --config=$DX_CONFIG \
      --accessToken=$KUBE_ACCESS_TOKEN \
      --verbose
  fi

  popd
done

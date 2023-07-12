#!/bin/bash

# In the case of a new package to publish, add it to the array below.
# A corresponding CNAME (with proxy) could be created in Cloudflare DNS to improve page load time.
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

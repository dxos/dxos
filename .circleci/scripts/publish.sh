#!/bin/bash
set -euo pipefail

# Configure endpoints here:
# https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/dxos.org/dns/records

APPS=(
  ./docs
  ./packages/sdk/examples
  ./packages/devtools/devtools
  ./packages/apps/halo-app
  ./packages/apps/composer-app
  ./packages/apps/tasks
  ./packages/apps/todomvc
)

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ROOT=$(git rev-parse --show-toplevel)

GREEN=4783872
RED=16711680
YELLOW=16776960

function notifySuccess() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy successful", "description": "'$1' ('${DX_ENVIRONMENT-}')", "color": '$GREEN' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" $DX_DISCORD_WEBHOOK_URL
}

function notifyFailure() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy failed", "description": "'$1' ('${DX_ENVIRONMENT-}')", "color": '$RED' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" $DX_DISCORD_WEBHOOK_URL
}

function notifyStart() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy started", "description": "Environment: '${DX_ENVIRONMENT-}'", "color": '$YELLOW' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" $DX_DISCORD_WEBHOOK_URL
}

if [[ $BRANCH = "production" || $BRANCH = "staging" ]]; then
  notifyStart
fi

failed=""
succeded=""
devel_succeded=""
devel_failed=""

for APP in "${APPS[@]}"; do
  pushd $APP

  PACKAGE=${PWD##*/}
  PACKAGE_CAPS=${PACKAGE^^}
  PACKAGE_ENV=${PACKAGE_CAPS//-/_}

  if [ $BRANCH = "production" ]; then
    export DX_ENVIRONMENT=production
    export REMOTE_SOURCE=https://halo.dxos.org/vault.html
    export LOG_FILTER=error
    DX_CONFIG="$ROOT/.circleci/publish-config/config-production.yml"
    VERSION=$(cat package.json | jq -r ".version")

    eval "export DX_SENTRY_DESTINATION=$"${PACKAGE_ENV}_SENTRY_DSN""
    eval "export DX_TELEMETRY_API_KEY=$"${PACKAGE_ENV}_SEGMENT_API_KEY""

    set +e
    $ROOT/packages/devtools/cli/bin/run app publish \
      --config=$DX_CONFIG \
      --accessToken=$KUBE_ACCESS_TOKEN \
      --version=$VERSION \
      --skipExisting \
      --verbose
    if [[ $? -eq 0 ]]; then
      succeded="${succeded:+$succeded,}$PACKAGE"
    else
      failed="${failed:+$failed,}$PACKAGE"
    fi
    set -e
  elif [ $BRANCH = "staging" ]; then
    export DX_ENVIRONMENT=staging
    export REMOTE_SOURCE=https://halo.staging.dxos.org/vault.html
    export LOG_FILTER=error
    DX_CONFIG="$ROOT/.circleci/publish-config/config-staging.yml"
    VERSION=$(cat package.json | jq -r ".version")

    set +e
    $ROOT/packages/devtools/cli/bin/run app publish \
      --config=$DX_CONFIG \
      --accessToken=$KUBE_ACCESS_TOKEN \
      --version=$VERSION \
      --verbose
    if [[ $? -eq 0 ]]; then
      succeded="${succeded:+$succeded,}$PACKAGE"
    else
      failed="${failed:+$failed,}$PACKAGE"
    fi
    set -e
  else
    export DX_ENVIRONMENT=development
    export REMOTE_SOURCE=https://halo.dev.dxos.org/vault.html
    # the default per packages/common/log/src/options.ts
    export LOG_FILTER=info
    DX_CONFIG="$ROOT/.circleci/publish-config/config-development.yml"

    set +e
    $ROOT/packages/devtools/cli/bin/run app publish \
      --config=$DX_CONFIG \
      --accessToken=$KUBE_ACCESS_TOKEN \
      --verbose
    if [[ $? -eq 0 ]]; then
      devel_succeded="${devel_succeded:+$devel_succeded,}$PACKAGE"
    else
      devel_failed="${devel_failed:+$devel_failed,}$PACKAGE"
    fi
    set -e
  fi
  popd
done

if [[ -n "$succeded" ]]; then
  notifySuccess $succeded
fi
if [[ -n "$failed" ]]; then
  notifyFailure $failed
fi

if [[ -n "$failed" ]] || [[ -n "$devel_failed" ]]; then
  exit 1
fi

#!/bin/bash
set -euo pipefail

# Configure endpoints here:
# https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/dxos.org/dns/records

APPS=(
  ./packages/apps/composer-app
)

unset NX_CLOUD_ACCESS_TOKEN
BRANCH=$(git rev-parse --abbrev-ref HEAD)

GREEN=4783872
RED=16711680
YELLOW=16776960

function notifySuccess() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy successful", "description": "'$1' ('${DX_ENVIRONMENT-}')", "color": '$GREEN' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DX_DISCORD_WEBHOOK_URL"
}

function notifyFailure() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy failed", "description": "'$1' ('${DX_ENVIRONMENT-}')", "color": '$RED' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DX_DISCORD_WEBHOOK_URL"
}

function notifyStart() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy started", "description": "Environment: '${DX_ENVIRONMENT-}'", "color": '$YELLOW' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DX_DISCORD_WEBHOOK_URL"
}

if [[ $BRANCH = "production" || $BRANCH = "staging" ]]; then
  DX_ENVIRONMENT=$BRANCH notifyStart
fi

failed=""
succeded=""
devel_succeded=""
devel_failed=""

for APP in "${APPS[@]}"; do
  pushd "$APP"

  PACKAGE=${PWD##*/}
  PACKAGE_CAPS=${PACKAGE^^}
  PACKAGE_ENV=${PACKAGE_CAPS//-/_}

  set +e
  eval "export DX_SENTRY_DESTINATION=$""${PACKAGE_ENV}"_SENTRY_DSN""
  eval "export DX_TELEMETRY_API_KEY=$""${PACKAGE_ENV}"_SEGMENT_API_KEY""
  export DX_ENVIRONMENT=$BRANCH
  export LOG_FILTER=error

  wrangler pages deploy ./out --branch "$BRANCH"

  if [[ $? -eq 0 ]]; then
    if [ "$BRANCH" = "main" ]; then
      devel_succeded="${devel_succeded:+$devel_succeded,}$PACKAGE"
    else
      succeded="${succeded:+$succeded,}$PACKAGE"
    fi
  else
    if [ "$BRANCH" = "main" ]; then
      devel_failed="${devel_failed:+$devel_failed,}$PACKAGE"
    else
      failed="${failed:+$failed,}$PACKAGE"
    fi
  fi
  set -e

  popd
done

if [[ -n "$succeded" ]]; then
  notifySuccess "$succeded"
fi
if [[ -n "$failed" ]]; then
  notifyFailure "$failed"
fi

if [[ -n "$failed" ]] || [[ -n "$devel_failed" ]]; then
  exit 1
fi

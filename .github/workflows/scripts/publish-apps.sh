#!/usr/bin/env bash

set -euo pipefail

# Configure endpoints here:
# https://dash.cloudflare.com/950816f3f59b079880a1ae33fb0ec320/dxos.org/dns/records

APPS=(
  "./packages/apps/composer-app"
  "./tools/storybook-react"
)

BRANCH=$(git rev-parse --abbrev-ref HEAD)

GREEN=4783872
RED=16711680
YELLOW=16776960

function notifySuccess() {
  if [[ -z "${DX_DISCORD_WEBHOOK_URL-}" ]]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy successful", "description": "'$1' ('${DX_ENVIRONMENT-}')", "color": '$GREEN' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DX_DISCORD_WEBHOOK_URL"
}

function notifyFailure() {
  if [[ -z "${DX_DISCORD_WEBHOOK_URL-}" ]]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy failed", "description": "'$1' ('${DX_ENVIRONMENT-}')", "color": '$RED' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DX_DISCORD_WEBHOOK_URL"
}

function notifyStart() {
  if [[ -z "${DX_DISCORD_WEBHOOK_URL-}" ]]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "Deploy started", "description": "Environment: '${DX_ENVIRONMENT-}'", "color": '$YELLOW' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DX_DISCORD_WEBHOOK_URL"
}

if [[ $BRANCH = "production" || $BRANCH = "staging" || $BRANCH = "labs" || $BRANCH = "dev" ]]; then
  notifyStart
fi

failed=""
succeeded=""
devel_succeeded=""
devel_failed=""

for APP_PATH in "${APPS[@]}"; do
  pushd "$APP_PATH"

  PACKAGE=${PWD##*/}
  PACKAGE_CAPS=${PACKAGE^^}
  PACKAGE_ENV=${PACKAGE_CAPS//-/_}

  APP=$(basename "$APP_PATH")
  if [[ $APP == *-app ]]; then
    set +e
    eval "export DX_POSTHOG_API_KEY=$""${PACKAGE_ENV}"_POSTHOG_API_KEY""
    eval "export DX_POSTHOG_API_HOST=$""${PACKAGE_ENV}"_POSTHOG_API_HOST""
    eval "export DX_POSTHOG_PROJECT_ID=$""${PACKAGE_ENV}"_POSTHOG_PROJECT_ID""
    eval "export DX_POSTHOG_FEEDBACK_SURVEY_ID=$""${PACKAGE_ENV}"_POSTHOG_FEEDBACK_SURVEY_ID""
    export LOG_FILTER="error"
  fi

  # Don't use the cache when bundling the app for deployment to avoid any caching issues causing bad builds.
  moon run "$APP:bundle" --force

  outdir=${APP%-app}
  if [[ $APP == *-app && -n "${POSTHOG_CLI_API_KEY-}" && -n "${DX_POSTHOG_PROJECT_ID-}" ]]; then
    BUILD_DIR="$(pwd)/out/$outdir"
    RELEASE_VERSION=$(jq -r '.version' "$(git rev-parse --show-toplevel)/package.json")
    POSTHOG_CLI_PROJECT_ID="$DX_POSTHOG_PROJECT_ID" pnpm -w exec posthog-cli sourcemap inject --directory "$BUILD_DIR"
    POSTHOG_CLI_PROJECT_ID="$DX_POSTHOG_PROJECT_ID" pnpm -w exec posthog-cli sourcemap upload --directory "$BUILD_DIR" \
      --release-name "$outdir" \
      --release-version "$RELEASE_VERSION"
  fi
  pnpm exec wrangler pages deploy out/"$outdir" --branch "$BRANCH"
  wrangler_rc=$?
  set -e

  if [[ "$wrangler_rc" -eq 0 ]]; then
    if [ "$BRANCH" = "main" ]; then
      devel_succeeded="${devel_succeeded:+$devel_succeeded,}$PACKAGE"
    else
      succeeded="${succeeded:+$succeeded,}$PACKAGE"
    fi
  else
    if [[ "$BRANCH" = "main" ]]; then
      devel_failed="${devel_failed:+$devel_failed,}$PACKAGE"
    else
      failed="${failed:+$failed,}$PACKAGE"
    fi
  fi
  popd
done

if [[ -n "$succeeded" ]]; then
  notifySuccess "$succeeded"
fi
if [[ -n "$failed" ]]; then
  notifyFailure "$failed"
fi

if [[ -n "$failed" ]] || [[ -n "$devel_failed" ]]; then
  exit 1
fi

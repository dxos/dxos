#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/apps.sh"

for APP_PATH in "${APPS[@]}"; do
  pushd "$APP_PATH"

  PACKAGE=${PWD##*/}
  PACKAGE_CAPS=${PACKAGE^^}
  PACKAGE_ENV=${PACKAGE_CAPS//-/_}

  APP=$(basename "$APP_PATH")
  if [[ $APP == *-app ]]; then
    eval "export DX_POSTHOG_API_KEY=$""${PACKAGE_ENV}"_POSTHOG_API_KEY""
    eval "export DX_POSTHOG_PROJECT_ID=$""${PACKAGE_ENV}"_POSTHOG_PROJECT_ID""
    eval "export DX_POSTHOG_FEEDBACK_SURVEY_ID=$""${PACKAGE_ENV}"_POSTHOG_FEEDBACK_SURVEY_ID""
    export LOG_FILTER="error"
  fi

  # Don't use the cache when bundling the app for deployment to avoid any caching issues causing bad builds.
  moon run "$APP:bundle" --force

  popd
done

#!/bin/bash

GREEN=4783872
RED=16711680
YELLOW=16776960

function notifySuccess() {
  if [ -z "$DISCORD_NPM_PUBLISH_WEBHOOK" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "NPM publish successful", "description": "Environment: '${DX_ENVIRONMENT-}'", "color": '$GREEN' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DISCORD_NPM_PUBLISH_WEBHOOK"
}

function notifyFailure() {
  if [ -z "$DISCORD_NPM_PUBLISH_WEBHOOK" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "NPM publish failed", "description": "Environment: '${DX_ENVIRONMENT-}'", "color": '$RED' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DISCORD_NPM_PUBLISH_WEBHOOK"
}

function notifyStart() {
  if [ -z "$DISCORD_NPM_PUBLISH_WEBHOOK" ]; then return; fi
  MESSAGE='{ "embeds": [{ "title": "NPM publish started", "description": "Environment: '${DX_ENVIRONMENT-}'", "color": '$YELLOW' }] }'
  curl -H "Content-Type: application/json" -d "${MESSAGE-}" "$DISCORD_NPM_PUBLISH_WEBHOOK"
}

notifyStart;

# NPM_TOKEN is used as fallback for packages without trusted publisher configured.
# Packages with trusted publisher will automatically use OIDC (no token needed).
# Once all packages have trusted publisher, this line can be removed.
if [ -n "$NPM_TOKEN" ]; then
  echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc
fi

if [ "$DX_ENVIRONMENT" = "production" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --provenance --tag=latest
  moon run :publish -- --provenance --tag latest
elif [ "$DX_ENVIRONMENT" = "staging" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --provenance --tag=next
  moon run :publish -- --provenance --tag next
elif [ "$DX_ENVIRONMENT" = "main" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --provenance --tag=main
  moon run :publish -- --provenance --tag main
elif [ "$DX_ENVIRONMENT" = "labs" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --provenance --tag=labs
  moon run :publish -- --provenance --tag labs
fi

if [[ $? -eq 0 ]]; then
  notifySuccess;
else
  notifyFailure;
  exit 1;
fi

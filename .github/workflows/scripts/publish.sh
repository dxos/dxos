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
echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc

if [ "$DX_ENVIRONMENT" = "production" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --tag=latest
  moon :publish -- --tag latest
elif [ "$DX_ENVIRONMENT" = "staging" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --tag=next
  moon :publish -- --tag next
elif [ "$DX_ENVIRONMENT" = "main" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --tag=main
  moon :publish -- --tag main
elif [ "$DX_ENVIRONMENT" = "labs" ]; then
  pnpm --filter-prod="./packages/**" --filter-prod="./vendor/**" publish --no-git-checks --tag=labs
  moon :publish -- --tag labs
fi

if [[ $? -eq 0 ]]; then
  notifySuccess;
else
  notifyFailure;
  exit 1;
fi

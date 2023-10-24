#!/bin/bash

GREEN=4783872
RED=16711680
YELLOW=16776960

function notifySuccess() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "content": "<@332330209858813952>", "embeds": [{ "title": "Daily testing successful", "description": "'$CIRCLE_BUILD_URL'", "color": '$GREEN' }] }'
  echo $MESSAGE
  curl -H "Content-Type: application/json" -d "${MESSAGE}" $DX_DISCORD_WEBHOOK_URL
}

function notifyFailure() {
  if [ -z "$DX_DISCORD_WEBHOOK_URL" ]; then return; fi
  MESSAGE='{ "content": "<@332330209858813952>", "embeds": [{ "title": "Daily testing failed", "description": "'$CIRCLE_BUILD_URL'", "color": '$RED' }] }'
  echo $MESSAGE
  curl -H "Content-Type: application/json" -d "${MESSAGE}" $DX_DISCORD_WEBHOOK_URL
}

if [ "$1" = "success" ]; then
  notifySuccess
else
  notifyFailure
fi

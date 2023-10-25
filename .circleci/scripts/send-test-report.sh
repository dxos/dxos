#!/bin/bash

ROLE_ID=1166483404066402414
GREEN=4783872
RED=16711680

function notifySuccess() {
  if [ -z "$DISCORD_TEST_REPORT_WEBHOOK" ]; then return; fi
  MESSAGE='{ "content": "🌈✨✅", "embeds": [{ "title": "Daily testing successful: '$1'", "description": "'$CIRCLE_BUILD_URL'", "color": '$GREEN' }] }'
  echo $MESSAGE
  curl -H "Content-Type: application/json" -d "${MESSAGE}" $DISCORD_TEST_REPORT_WEBHOOK
}

function notifyFailure() {
  if [ -z "$DISCORD_TEST_REPORT_WEBHOOK" ]; then return; fi
  MESSAGE='{ "content": "⚠️ <@&'$ROLE_ID'>", "embeds": [{ "title": "Daily testing failed: '$1'", "description": "'$CIRCLE_BUILD_URL'", "color": '$RED' }] }'
  echo $MESSAGE
  curl -H "Content-Type: application/json" -d "${MESSAGE}" $DISCORD_TEST_REPORT_WEBHOOK
}

if [ "$2" = "success" ]; then
  notifySuccess $1
else
  notifyFailure $1
fi

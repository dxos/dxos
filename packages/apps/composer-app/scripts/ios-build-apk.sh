#!/bin/sh
#
# Note: You need to go through the steps here before you'll be able to run this script
# https://github.com/dxos/dxos/tree/main/packages/apps/composer-app/docs/ios

DX_HOST=true pnpm -w nx bundle composer-app

# Builds an iOS app APK with code signing
ssc build -o -c -p --platform ios

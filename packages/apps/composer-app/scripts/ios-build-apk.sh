#!/bin/sh

# Note: You need to go through the steps here before you'll be able to run this script
# https://github.com/dxos/dxos/tree/main/packages/apps/composer-app/docs/ios

# Bundle app.
DX_HOST=true moon run composer-app:bundle

# Builds an iOS app APK with code signing.
# NOTE: Version 6 from source.
ssc build -c -o -p --prod --platform ios

#!/bin/sh
#
# Note: You need to go through the steps here before you'll be able to run this script
# https://github.com/dxos/dxos/tree/main/packages/apps/composer-app/docs/ios

DX_HOST=true moon run composer-app:bundle

ssc build -r -o --platform ios-simulator

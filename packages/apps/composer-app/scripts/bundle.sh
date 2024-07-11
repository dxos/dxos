#!/bin/sh
set -e

DX_HOST=true pnpm -w nx bundle composer-app

ssc build -r

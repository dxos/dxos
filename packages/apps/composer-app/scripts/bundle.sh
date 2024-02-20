#!/bin/sh

DX_HOST=true pnpm -w nx bundle composer-app

ssc build -r

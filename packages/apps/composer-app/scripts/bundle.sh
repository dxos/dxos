#!/bin/sh

NODE_OPTIONS=--max_old_space_size=8192
DX_HOST=true
pnpm -w nx bundle composer-app

ssc build -r

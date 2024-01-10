#!/bin/bash -x

export DX_CONFIG=./config/config-local.yml

export PATH=$PATH:./bin

pnpm -w nx build cli

# Device join
dx halo join

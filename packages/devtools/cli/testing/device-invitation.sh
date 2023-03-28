#!/bin/bash -x

export DX_CONFIG=./config/config-local.yml

dx=./bin/run

pnpm -w nx build cli

# Device join
$dx halo join

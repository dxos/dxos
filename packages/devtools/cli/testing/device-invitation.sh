#!/bin/bash -x

export DX_CONFIG=./config/config-local.yml

export PATH=$PATH:./bin

moon run cli:build

# Device join
dx halo join

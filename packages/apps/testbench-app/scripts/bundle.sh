#!/bin/sh
set -e

DX_HOST=true pnpm -w nx bundle testbench-app

ssc build -r

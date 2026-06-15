#!/bin/sh
set -e

DX_HOST=true moon run testbench-app:bundle

ssc build -r

#!/bin/bash

# Set up environment variables
export ACT_RUNNER_ARCH=arm64
export ACT_RUNNER_OS=linux
export ACT_RUNNER_WORKING_DIR=/Users/burdon/Code/dxos/dxos

# Run act with the correct architecture
act -j "$1" -e ".github/workflows/test-push-event.json" --container-architecture linux/arm64 --workflows ".github/workflows/ci.yml"

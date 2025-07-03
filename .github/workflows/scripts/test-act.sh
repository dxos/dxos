#!/bin/sh

# Set up environment variables.
# export ACT_RUNNER_ARCH=arm64
# export ACT_RUNNER_OS=linux
# export ACT_RUNNER_WORKING_DIR=".github/workflows"

WORKFLOW=${1:-main.yml}
JOB=${2:-ci}

# Run act with the correct architecture.
act \
  --job "$JOB" \
  --workflows ".github/workflows/$WORKFLOW" \
  --eventpath ".github/workflows/testing/test-push-event.json" \
  --secret-file .github/workflows/env/.secrets \
  --container-architecture linux/amd64 \
  -P ghcr.io/dxos/gh-actions:20.12.1=ghcr.io/dxos/gh-actions:latest

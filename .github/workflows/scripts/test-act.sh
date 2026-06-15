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
  --eventpath=.github/workflows/testing/test-push-event.json

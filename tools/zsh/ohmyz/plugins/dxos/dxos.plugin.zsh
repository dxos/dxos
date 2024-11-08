#!/bin/zsh

#
# Oh My Zsh plugin.
#

# TODO(burdon): Replace with zoxide
# https://github.com/dmaretskyi/monorepo-cd
eval "$(monorepo-cd --init m)"

#
# Git
#

alias gs='git-branch-select -l'
alias gb='git branch -vv'

#
# NX
# pnpm nx run-many --target=build
# pnpm -w nx build <target> --watch
#

alias pi="pnpm install"
alias pw="pnpm watch"
alias px="pnpm -w nx"
alias nx="pnpm -w nx"

# Run target in local directory (e.g., `p build`).
function p () {
  TARGET=$1
  shift 1

  px $TARGET "${PWD##*/}" "$@"
}

# Build
function pb () {
  px build "${PWD##*/}" "$@"
}

# Test
function pt () {
  px test "${PWD##*/}" "$@"
}

# Break NX cache (e.g., `pc test`).
function pc () {
  TARGET=$1
  shift 1

  px $TARGET "${PWD##*/}" "$@" "${RANDOM}"
}

# Run everything (e.g., `pa build`).
function pa () {
  TARGET=$1
  shift 1

  ROOT=$(git rev-parse --show-toplevel)
  if [ "$ROOT" = "$PWD" ]; then
    px run-many --target=$TARGET "$@"
  else;
    pushd $ROOT
    nx run-many --target=$TARGET "$@"
    popd
  fi;
}

# Build, test and lint everything.
function pre () {
  if [ "$1" = "-c" ]; then
    git clean -xdf
  fi;

  # export CI=true
  # ROOT=$(git rev-parse --show-toplevel)
  px reset

  CI=true pi
  CI=true pa build
  CI=true pa test
  CI=true pa lint
}

#
# Set CIRCLECI_TOKEN
#

CIRCLECI_ORG="dxos"
CIRCLECI_REPO="dxos"

function ci_status () {
  tput sc
  PROJECT_ID=$(curl -s -H "Circle-Token: $CIRCLECI_TOKEN" "https://circleci.com/api/v2/project/github/$CIRCLECI_ORG/$CIRCLECI_REPO/pipeline?branch=$(git branch --show-current)" | jq -r ".items.[0].id")
  echo "Pipeline: $PROJECT_ID"
  RESULT=$(curl -s -H "Circle-Token: $CIRCLECI_TOKEN" "https://circleci.com/api/v2/pipeline/$PROJECT_ID/workflow")
  STATUS=$(echo -e "$RESULT" | jq -r ".items.[0].status")
  echo $STATUS
  if [ "$STATUS" = "success" ] || [ "$STATUS" = "error" ]; then
    return 1
  fi;
  echo -e "$RESULT" | jq
  tput rc
}

function ci () {
  while true; do
    ci_status
    if [ $? -eq 1 ]; then
      break
    fi
    sleep 5
  done
}

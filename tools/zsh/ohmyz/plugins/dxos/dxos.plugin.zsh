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

function ci () {
  function ci_status () {
    PROJECT_SLUG="gh/$CIRCLECI_ORG/$CIRCLECI_REPO"

    # Get project.
    PROJECT_ID=$(curl -s -H "Circle-Token: $CIRCLECI_TOKEN" \
      "https://circleci.com/api/v2/project/${PROJECT_SLUG}/pipeline?branch=$(git branch --show-current)" | jq -r '.items.[0].id')

    tput sc
    echo -e "Pipeline: $PROJECT_ID"

    # Get workflow.
    URL="https://circleci.com/api/v2/pipeline/${PROJECT_ID}/workflow"
    RESPONSE=$(curl -s -H "Circle-Token: $CIRCLECI_TOKEN" $URL)

    echo -e "$RESPONSE" | jq
    tput rc

    STATUS=$(echo -e "$RESPONSE" | jq -r '.items.[0].status')
    if [ "$STATUS" = "failed" ]; then
      WORKFLOW_ID=$(echo -e "$RESPONSE" | jq -r '.items.[0].id')

      # Get failed job.
      JOB_ID=$(curl -s -H "Circle-Token: $CIRCLECI_TOKEN" \
        "https://circleci.com/api/v2/workflow/${WORKFLOW_ID}/job" | jq -r '.items[] | select(.status=="failed") | .job_number')

      URL=$(curl -s -H "Circle-Token: $CIRCLECI_TOKEN" \
        "https://circleci.com/api/v2/project/${PROJECT_SLUG}/job/${JOB_ID}")
    fi
  }

  while true; do
    ci_status
    case "$STATUS" in
      "running")
      ;;
      *)
        echo ""
        echo "Result $STATUS"
        echo "$URL"
        break
      ;;
    esac
    sleep 10
  done
}

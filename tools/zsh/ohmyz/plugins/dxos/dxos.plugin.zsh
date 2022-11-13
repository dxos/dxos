#!/bin/zsh

#
# Oh My Zsh plugin.
#

# https://github.com/dmaretskyi/monorepo-cd
eval "$(monorepo-cd --init m)"

#
# Git
#

gs='git-branch-select -l'
gb='git branch -vv'

#
# NX
# pnpm nx run-many --target=build
# pnpm nx build <target> --watch
#

alias px="pnpm -w nx"

# Run target in local directory (e.g., `p build`).
function p () {
  px $1 "${PWD##*/}" "$@"
}

# Break NX cache (e.g., `pc test`).
function pc () {
  px $1 "${PWD##*/}" "$@" "${RANDOM}"
}

# Run everything (e.g., `pa build`).
function pa () {
  ROOT=$(git rev-parse --show-toplevel)
  if [ "$ROOT" = "$PWD" ]; then
    pnpm nx run-many --target=$1
  else;
    pushd $ROOT
    pnpm nx run-many --target=$1
    popd
  fi;
}

# Build, test and lint everything.
function pre () {
  if [ "$1" = "-c" ]; then
    git clean -xdf
  fi;

  pnpm i
  pa build
  pa test
  pa lint
}

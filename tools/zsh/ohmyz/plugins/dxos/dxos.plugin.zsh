#!/bin/zsh

#
# Oh My Zsh plugin.
#

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

alias nx="pnpm -w nx"

# Run target in local directory (e.g., `p build`).
function p () {
  TARGET=$1
  shift 1

  nx $TARGET "${PWD##*/}" "$@"
}

# Break NX cache (e.g., `pc test`).
function pc () {
  TARGET=$1
  shift 1

  nx $TARGET "${PWD##*/}" "$@" "${RANDOM}"
}

# Run everything (e.g., `pa build`).
function pa () {
  TARGET=$1
  shift 1

  ROOT=$(git rev-parse --show-toplevel)
  if [ "$ROOT" = "$PWD" ]; then
    nx run-many --target=$TARGET $@
  else;
    pushd $ROOT
    nx run-many --target=$TARGET $@
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

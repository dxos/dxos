#!/usr/bin/env zsh
set -euxo pipefail

pnpm jscodeshift --parser=tsx --extensions=ts ../../**/*.ts "$@"